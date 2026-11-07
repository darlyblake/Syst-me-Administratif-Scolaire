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

  // Indicateurs opérationnels du tableau de bord scolaire.
  async getSchoolDashboardSummary(establishmentId: string, academicYearId: string, today: string, monthStart: string) {
    const activitySince = new Date(today + "T00:00:00+01:00");
    activitySince.setDate(activitySince.getDate() - 30);
    const [classes, teachers, staff, staffAttendance, pendingEnrollments, attendance, revenue, schoolEvents, auditLogs] = await Promise.all([
      supabaseBrowser.from("school_classes").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true),
      supabaseBrowser.from("teachers").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true),
      supabaseBrowser.from("staff_members").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true),
      supabaseBrowser.from("staff_attendance").select("staff_type, staff_id, status").eq("establishment_id", establishmentId).eq("attendance_date", today),
      supabaseBrowser.from("enrollments").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("academic_year_id", academicYearId).eq("status", "pending"),
      supabaseBrowser.from("attendance_records").select("status").eq("establishment_id", establishmentId).eq("attendance_date", today),
      supabaseBrowser.rpc("finance_movement_summary", { p_establishment_id: establishmentId, p_from: monthStart, p_to: today, p_direction: "credit" }),
      supabaseBrowser.from("school_events").select("id, title, description, event_type, starts_at, ends_at, location", { count: "exact" }).eq("establishment_id", establishmentId).eq("academic_year_id", academicYearId).gte("starts_at", today + "T00:00:00+01:00").order("starts_at", { ascending: true }).limit(8),
      supabaseBrowser.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, metadata, created_at").eq("establishment_id", establishmentId).gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(40),
    ]);

    const [studentsActivity, enrollmentsActivity, paymentsActivity, expensesActivity] = await Promise.all([
      supabaseBrowser.from("students").select("id, first_name, last_name, created_at").eq("establishment_id", establishmentId).gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(5),
      supabaseBrowser.from("enrollments").select("id, created_at, status").eq("establishment_id", establishmentId).gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(5),
      supabaseBrowser.from("payments").select("id, amount, recorded_by, created_at").eq("establishment_id", establishmentId).gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(5),
      supabaseBrowser.from("expenses").select("id, description, amount, created_by, created_at").eq("establishment_id", establishmentId).gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(5),
    ]);
    const actorIds = Array.from(new Set([
      ...(auditLogs.data ?? []).map((row: any) => row.actor_id || row.metadata?.actor_user_id).filter(Boolean),
      ...(paymentsActivity.data ?? []).filter((row: any) => !(auditLogs.data ?? []).some((log: any) => log.entity_id === row.id)).map((row: any) => row.recorded_by).filter(Boolean),
      ...(expensesActivity.data ?? []).filter((row: any) => !(auditLogs.data ?? []).some((log: any) => log.entity_id === row.id)).map((row: any) => row.created_by).filter(Boolean),
    ]));
    const profilesResult = actorIds.length ? await supabaseBrowser.from("profiles").select("id, first_name, last_name").in("id", actorIds) : { data: [], error: null };
    const profileNames = new Map<string, string>((profilesResult.data ?? []).map((profile: any) => [profile.id, [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()]));
    const actorName = (id?: string | null) => id ? (profileNames.get(id) || "Utilisateur sans nom de profil") : "Auteur non renseigné";

    const results = [classes, teachers, staff, staffAttendance, pendingEnrollments, attendance, revenue, schoolEvents, auditLogs];
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error("Impossible de charger tous les indicateurs du tableau de bord.");

    const attendanceRows = staffAttendance.data ?? [];
    const presentStaff = new Set(
      attendanceRows
        .filter((row: any) => ["present", "late"].includes(String(row.status).toLowerCase()))
        .map((row: any) => `${row.staff_type}:${row.staff_id}`),
    );
    const attendanceStatuses = (attendance.data ?? []).map((row: any) => String(row.status).toLowerCase());
    const revenueRow = Array.isArray(revenue.data) ? revenue.data[0] : revenue.data;

    return {
      activeClasses: classes.count ?? 0,
      activeTeachers: teachers.count ?? 0,
      activeStaff: (staff.count ?? 0) + (teachers.count ?? 0),
      staffPresent: presentStaff.size,
      staffAttendanceRecorded: attendanceRows.length,
      pendingEnrollments: pendingEnrollments.count ?? 0,
      absences: attendanceStatuses.filter((status) => status === "absent").length,
      lateArrivals: attendanceStatuses.filter((status) => status === "late").length,
      justifiedAbsences: attendanceStatuses.filter((status) => status === "justified").length,
      monthlyReceipts: Number(revenueRow?.total_in ?? 0),
      upcomingEvents: schoolEvents.data ?? [],
      upcomingEventsCount: schoolEvents.count ?? 0,
      recentActivity: [
        ...(auditLogs.data ?? []).map((row: any) => ({ id: row.id, action: row.action, entity_type: row.entity_type, created_at: row.created_at, actor_name: actorName(row.actor_id || row.metadata?.actor_user_id) })),
        ...(studentsActivity.data ?? []).filter((row: any) => !(auditLogs.data ?? []).some((log: any) => log.entity_id === row.id)).map((row: any) => ({ id: "student-" + row.id, action: "Nouvel élève ajouté", entity_type: [row.first_name, row.last_name].filter(Boolean).join(" "), created_at: row.created_at, actor_name: "Auteur non renseigné" })),
        ...(enrollmentsActivity.data ?? []).filter((row: any) => !(auditLogs.data ?? []).some((log: any) => log.entity_id === row.id)).map((row: any) => ({ id: "enrollment-" + row.id, action: "Inscription enregistrée", entity_type: "Dossier " + String(row.status ?? "").toLowerCase(), created_at: row.created_at, actor_name: "Auteur non renseigné" })),
        ...(paymentsActivity.data ?? []).map((row: any) => ({ id: "payment-" + row.id, action: "Paiement enregistré", entity_type: Number(row.amount || 0).toLocaleString("fr-FR") + " FCFA", created_at: row.created_at, actor_name: actorName(row.recorded_by) })),
        ...(expensesActivity.data ?? []).map((row: any) => ({ id: "expense-" + row.id, action: "Dépense enregistrée", entity_type: row.description || (Number(row.amount || 0).toLocaleString("fr-FR") + " FCFA"), created_at: row.created_at, actor_name: actorName(row.created_by) })),
      ].filter((row) => row.created_at).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    };
  },

  // Échéances de la famille réellement dépassées pour le tableau de bord.
  async getOverdueSchedules(establishmentId: string, academicYearId: string, today: string) {
    const { data, error } = await supabaseBrowser
      .from("v_finance_student_payment_board")
      .select("schedule_id, enrollment_id, student_id, class_id, label, due_date, amount_due, amount_paid, remaining_amount, days_overdue, payment_state, category, first_name, last_name, student_number, class_name")
      .eq("establishment_id", establishmentId)
      .eq("academic_year_id", academicYearId)
      .gt("remaining_amount", 0)
      .lt("due_date", today)
      .order("due_date", { ascending: true });

    if (error) throw new Error("Impossible de charger les échéances en retard.");
    return data ?? [];
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
    return (Array.isArray(data) ? data[0] : data) as FinancePaymentSummary;
  },

  // 5. Résumé des mouvements (RPC)
  async getMovementSummary(establishmentId: string, from?: string, to?: string, direction?: 'all' | 'credit' | 'debit'): Promise<FinanceMovementSummary> {
    const { data, error } = await supabaseBrowser.rpc("finance_movement_summary", {
      p_establishment_id: establishmentId,
      p_from: from || null,
      p_to: to || null,
      p_direction: direction || "all"
    });
    
    if (error) throw new Error("Impossible de charger le résumé des mouvements.");
    return (Array.isArray(data) ? data[0] : data) as FinanceMovementSummary;
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