import { messageErreurFinance } from "@/lib/supabase/error-messages";
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
  async getMovements(establishmentId: string, from?: string, to?: string, direction?: 'credit' | 'debit'): Promise<FinanceMovementRow[]> {
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

  async getMovementDetails(movement: FinanceMovementRow) {
    const base = { movement }
    if (!movement.source_id || !movement.source_type) return base

    const sourceType = movement.source_type.toLowerCase()

    if (sourceType === "student_payment" || sourceType.includes("payment")) {
      const { data: payment, error: paymentError } = await supabaseBrowser
        .from("payments")
        .select("id, payment_date, amount, method, reference, notes, payer_type, category, enrollment_id")
        .eq("id", movement.source_id)
        .maybeSingle()
      if (paymentError) throw new Error("Impossible de charger le détail du paiement.")
      if (!payment) return base

      const { data: enrollment, error: enrollmentError } = await supabaseBrowser
        .from("enrollments")
        .select("id, student_id, class_id, academic_year_id, enrollment_date, funding_source")
        .eq("id", payment.enrollment_id)
        .maybeSingle()
      if (enrollmentError) throw new Error("Impossible de charger l'inscription du paiement.")

      let student: any = null
      let schoolClass: any = null
      let academicYear: any = null
      if (enrollment) {
        const [studentResult, classResult, yearResult] = await Promise.all([
          supabaseBrowser.from("students").select("id, first_name, last_name, student_number").eq("id", enrollment.student_id).maybeSingle(),
          supabaseBrowser.from("school_classes").select("id, name, code").eq("id", enrollment.class_id).maybeSingle(),
          supabaseBrowser.from("academic_years").select("id, name").eq("id", enrollment.academic_year_id).maybeSingle(),
        ])
        student = studentResult.data
        schoolClass = classResult.data
        academicYear = yearResult.data
      }

      const { data: allocations } = await supabaseBrowser
        .from("payment_allocations")
        .select("amount, payment_schedule_id, payment_schedules(id, installment_number, label, due_date, amount_due, category, payer_type)")
        .eq("payment_id", payment.id)

      return { ...base, kind: "student_payment", payment, enrollment, student, schoolClass, academicYear, allocations: allocations ?? [] }
    }

    if (sourceType.includes("expense") || sourceType.includes("depense")) {
      const { data: expense } = await supabaseBrowser
        .from("expenses")
        .select("id, category, description, amount, expense_date, payment_method, reference, created_by")
        .eq("id", movement.source_id)
        .maybeSingle()
      return { ...base, kind: "expense", expense }
    }

    if (sourceType.includes("payroll") || sourceType.includes("paie")) {
      const { data: payroll } = await supabaseBrowser
        .from("payroll_entries")
        .select("id, staff_type, staff_id, base_amount, overtime_amount, bonuses, deductions, net_amount, status, period_id")
        .eq("id", movement.source_id)
        .maybeSingle()
      let staff: any = null
      if (payroll?.staff_id) {
        if (payroll.staff_type?.toLowerCase().includes("teacher") || payroll.staff_type?.toLowerCase().includes("enseign")) {
          const result = await supabaseBrowser.from("teachers").select("id, first_name, last_name, employee_number, specialty").eq("id", payroll.staff_id).maybeSingle()
          staff = result.data
        }
      }
      const { data: period } = payroll?.period_id ? await supabaseBrowser.from("payroll_periods").select("id, name, starts_on, ends_on").eq("id", payroll.period_id).maybeSingle() : { data: null }
      return { ...base, kind: "payroll", payroll, staff, period }
    }

    return base
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


  // 3bis. Dettes des années antérieures
  async getLegacyDebts(establishmentId: string, beforeAcademicYearId?: string | null) {
    let yearIds: string[] | null = null
    let years: any[] = []

    const { data: allYears, error: yearsError } = await supabaseBrowser
      .from("academic_years")
      .select("id, name, start_date, end_date")
      .eq("establishment_id", establishmentId)
      .order("start_date", { ascending: false })
    if (yearsError) throw new Error("Impossible de charger les années académiques.")
    years = allYears ?? []

    if (beforeAcademicYearId) {
      const currentYear = years.find((year) => year.id === beforeAcademicYearId)
      if (currentYear?.start_date) {
        yearIds = years
          .filter((year) => year.start_date < currentYear.start_date)
          .map((year) => year.id)
        if (yearIds.length === 0) return []
      }
    }

    let query = supabaseBrowser
      .from("v_finance_student_payment_board")
      .select("*, student:students!student_id(first_name, last_name, student_number), class:school_classes!class_id(name)")
      .eq("establishment_id", establishmentId)
      .gt("remaining_amount", 0)

    if (yearIds) query = query.in("academic_year_id", yearIds)

    const { data, error } = await query.order("student_id").order("academic_year_id").order("installment_number")
    if (error) throw new Error("Impossible de charger les dettes antérieures.")

    const yearMap = new Map(years.map((year) => [year.id, year]))
    return (data ?? []).map((row: any) => ({
      ...row,
      academic_year: yearMap.get(row.academic_year_id) ?? null,
    })) as any[]
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
    
    if (error) throw new Error(messageErreurFinance(error, "Impossible d’enregistrer le paiement."));
    return data as string;
  },

  async getExpenses(establishmentId: string, from?: string, to?: string) {
    let query = supabaseBrowser.from("expenses")
      .select("id, establishment_id, account_id, category, description, amount, expense_date, payment_method, reference, created_by, created_at")
      .eq("establishment_id", establishmentId)
    if (from) query = query.gte("expense_date", from)
    if (to) query = query.lte("expense_date", to)
    const { data, error } = await query.order("expense_date", { ascending: false }).order("created_at", { ascending: false })
    if (error) throw new Error("Impossible de charger les dépenses.")
    return data ?? []
  },

  async createExpense(input: { establishmentId: string; category: string; description: string; amount: number; expenseDate: string; paymentMethod: string; reference?: string }) {
    const { data: userResult } = await supabaseBrowser.auth.getUser()
    const userId = userResult.user?.id
    if (!userId) throw new Error("Votre session a expiré. Veuillez vous reconnecter.")
    const { data: account, error: accountError } = await supabaseBrowser.from("accounting_accounts")
      .select("id").eq("establishment_id", input.establishmentId).eq("code", "571").eq("active", true).maybeSingle()
    if (accountError) throw new Error("Impossible de trouver la caisse générale.")
    if (!account) throw new Error("La caisse générale (571) n'est pas configurée.")
    const reference = input.reference?.trim() || ("DEP-" + Date.now().toString(36).toUpperCase())
    const { data, error } = await supabaseBrowser.from("expenses").insert({
      establishment_id: input.establishmentId, account_id: account.id, category: input.category.trim(),
      description: input.description.trim(), amount: input.amount, expense_date: input.expenseDate,
      payment_method: input.paymentMethod, reference, created_by: userId,
    }).select("id, establishment_id, account_id, category, description, amount, expense_date, payment_method, reference, created_by, created_at").single()
    if (error) throw new Error(error.message || "Impossible d'enregistrer la dépense.")
    return data
  },
};