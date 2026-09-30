import { supabaseBrowser } from "@/lib/supabase/client";
import type { 
  FinanceStudentPaymentBoardRow, 
  FinanceMovementRow, 
  FinancePaymentHistoryRow,
  FinanceMovementSummary,
  FinancePaymentSummary 
} from "@/lib/supabase/types";

export const financeService = {
  // 1. Vue Scolarité (Échéances)
    async getStudentPaymentBoard(establishmentId: string, academicYearId: string, classId?: string | null): Promise<(FinanceStudentPaymentBoardRow & { student?: any, class?: any })[]> {
    let query = supabaseBrowser
      .from("v_finance_student_payment_board")
      .select("*, student:students!student_id(first_name, last_name, student_number), class:school_classes!class_id(name)")
      .eq("establishment_id", establishmentId)
      .eq("academic_year_id", academicYearId);
      
    if (classId) {
      query = query.eq("class_id", classId);
    }
    
    // Order by student_id and then installment_number for a consistent grid
    const { data, error } = await query.order("student_id").order("installment_number");
    
    if (error) {
      console.warn("Failed to join students/classes, falling back to base view", error);
      // Fallback query if the foreign key names are different or not detected
      let fallbackQuery = supabaseBrowser
        .from("v_finance_student_payment_board")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("academic_year_id", academicYearId);
      if (classId) fallbackQuery = fallbackQuery.eq("class_id", classId);
      
      const res = await fallbackQuery.order("student_id").order("installment_number");
      if (res.error) throw new Error("Impossible de charger la grille des scolarités.");
      return (res.data ?? []) as any[];
    }
    
    return (data ?? []) as any[];
  },

  // 2. Vue Mouvements
  async getMovements(establishmentId: string, from?: string, to?: string, direction?: 'in' | 'out'): Promise<FinanceMovementRow[]> {
    let query = supabaseBrowser
      .from("v_finance_movements")
      .select("*")
      .eq("establishment_id", establishmentId);
      
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    if (direction) query = query.eq("direction", direction);
    
    const { data, error } = await query.order("transaction_date", { ascending: false });
    
    if (error) throw new Error("Impossible de charger les mouvements.");
    return (data ?? []) as FinanceMovementRow[];
  },

  // 3. Historique d'un paiement / d'un élève
  async getPaymentHistory(establishmentId: string, enrollmentId?: string): Promise<FinancePaymentHistoryRow[]> {
    let query = supabaseBrowser
      .from("v_finance_payment_history")
      .select("*")
      .eq("establishment_id", establishmentId);
      
    if (enrollmentId) {
      query = query.eq("enrollment_id", enrollmentId);
    }
    
    const { data, error } = await query.order("payment_date", { ascending: false });
    if (error) throw new Error("Impossible de charger l'historique des paiements.");
    return (data ?? []) as FinancePaymentHistoryRow[];
  },

  // 4. Résumé financier de scolarité (RPC)
  async getPaymentSummary(establishmentId: string, academicYearId: string): Promise<FinancePaymentSummary> {
    const { data, error } = await supabaseBrowser.rpc("get_payment_summary", {
      p_establishment_id: establishmentId,
      p_academic_year_id: academicYearId
    });
    
    if (error) throw new Error("Impossible de charger le résumé de la scolarité.");
    return data as FinancePaymentSummary;
  },

  // 5. Résumé des mouvements (RPC)
  async getMovementSummary(establishmentId: string, from: string, to: string, direction?: 'in' | 'out'): Promise<FinanceMovementSummary> {
    const { data, error } = await supabaseBrowser.rpc("finance_movement_summary", {
      p_establishment_id: establishmentId,
      p_from: from,
      p_to: to,
      p_direction: direction || null
    });
    
    if (error) throw new Error("Impossible de charger le résumé des mouvements.");
    return data as FinanceMovementSummary;
  },

  async getActiveStudentOptions(establishmentId: string) {
    const { data, error } = await supabaseBrowser
      .from("student_options")
      .select("id,name,default_amount,code,description")
      .eq("establishment_id", establishmentId)
      .eq("active", true)
      .order("name")
    if (error) throw new Error("Impossible de charger les options.")
    return data ?? []
  },

  async addEnrollmentOption(enrollmentId: string, optionId: string) {
    const { data, error } = await supabaseBrowser.rpc("add_enrollment_option", {
      p_enrollment_id: enrollmentId,
      p_option_id: optionId,
    })
    if (error) throw new Error(error.message || "Impossible d'ajouter l'option.")
    return data as { id: string; schedule_id?: string | null; already_exists?: boolean }
  },

  // 6. Encaissement atomique (RPC)
  async createPaymentWithAllocations(
    enrollmentId: string, 
    amount: number, 
    method: string, 
    allocations: { payment_schedule_id: string, amount: number }[],
    reference?: string,
    notes?: string
  ): Promise<string> {
    const { data, error } = await supabaseBrowser.rpc("create_payment_with_allocations", {
      p_enrollment_id: enrollmentId,
      p_amount: amount,
      p_reference: reference || null,
      p_method: method,
      p_notes: notes || null,
      p_allocations: allocations
    });
    
    if (error) throw new Error(error.message || "Impossible d'enregistrer le paiement.");
    return data as string;
  }
};
