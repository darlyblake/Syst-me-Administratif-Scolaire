import { messageErreurFinance } from "@/lib/supabase/error-messages";
import { supabaseBrowser } from "@/lib/supabase/client";
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions";
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
    const { data, error } = await supabaseBrowser.rpc("get_finance_student_payment_board", {
      p_establishment_id: establishmentId,
      p_academic_year_id: academicYearId,
      p_class_id: classId ?? null,
      p_overdue_only: false,
      p_today: new Date().toISOString().slice(0, 10),
    })
    if (error) throw new Error("Impossible de charger la grille des scolarités.")

    return ((data ?? []) as any[]).map((row: any) => ({
      ...row,
      student: {
        id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        student_number: row.student_number,
      },
      class: { id: row.class_id, name: row.class_name },
    }))
  },

  // Indicateurs opérationnels du tableau de bord scolaire.
  async getSchoolDashboardSummary(establishmentId: string, academicYearId: string, today: string, monthStart: string) {
    const activitySince = new Date(today + "T00:00:00+01:00")
    activitySince.setDate(activitySince.getDate() - 30)

    const { data: authContext, error: authError } = await supabaseBrowser.rpc("get_my_auth_context")
    if (authError) throw new Error("Impossible de vérifier les autorisations du tableau de bord.")

    const membership = (authContext?.establishments ?? []).find((item: any) => item.id === establishmentId)
    if (!membership) throw new Error("Vous n’êtes pas membre de cet établissement.")

    const permissionUser = {
      role: membership.role,
      etablissementRole: membership.role,
      permissions: membership.permissions ?? [],
      revoked_permissions: membership.revoked_permissions ?? [],
      account_type: authContext?.account_type,
    }
    const can = (permission: string) => hasEffectiveSchoolPermission(permissionUser as any, permission)
    const isTeacher = authContext?.account_type === "teacher" || ["teacher", "enseignant"].includes(String(membership.role ?? "").toLowerCase())
    const canSeeClasses = ["classes.view", "inscriptions.read", "students.read", "attendance.read"].some(can)
    const canSeeTeachers = can("teachers.view")
    const canSeeStaff = can("staff.view")
    const canSeeEnrollments = can("inscriptions.read")
    const canSeeAttendance = can("attendance.read")
    const canSeeFinance = can("payments.view")
    const canSeeEvents = can("dashboard.view") || isTeacher
    const canSeeDashboardActivity = can("dashboard.view")

    const emptyCount = { data: null, count: 0, error: null }
    const emptyRows = { data: [], count: 0, error: null }
    const [
      classes,
      teachers,
      staff,
      staffAttendance,
      pendingEnrollments,
      attendance,
      revenue,
      schoolEvents,
      activity,
    ] = await Promise.all([
      canSeeClasses
        ? supabaseBrowser.from("school_classes").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true)
        : Promise.resolve(emptyCount),
      canSeeTeachers
        ? supabaseBrowser.from("teachers").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true)
        : Promise.resolve(emptyCount),
      canSeeStaff
        ? supabaseBrowser.from("staff_members").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("active", true)
        : Promise.resolve(emptyCount),
      canSeeStaff
        ? supabaseBrowser.from("staff_attendance").select("staff_type, staff_id, status").eq("establishment_id", establishmentId).eq("attendance_date", today)
        : Promise.resolve(emptyRows),
      canSeeEnrollments
        ? supabaseBrowser.from("enrollments").select("id", { count: "exact", head: true }).eq("establishment_id", establishmentId).eq("academic_year_id", academicYearId).eq("status", "pending")
        : Promise.resolve(emptyCount),
      canSeeAttendance
        ? supabaseBrowser.from("attendance_records").select("status").eq("establishment_id", establishmentId).eq("attendance_date", today)
        : Promise.resolve(emptyRows),
      canSeeFinance
        ? supabaseBrowser.rpc("finance_movement_summary", { p_establishment_id: establishmentId, p_from: monthStart, p_to: today, p_direction: "credit" })
        : Promise.resolve({ data: [], error: null }),
      canSeeEvents
        ? supabaseBrowser.from("school_events").select("id, title, description, event_type, starts_at, ends_at, location", { count: "exact" }).eq("establishment_id", establishmentId).eq("academic_year_id", academicYearId).gte("starts_at", today + "T00:00:00+01:00").order("starts_at", { ascending: true }).limit(8)
        : Promise.resolve(emptyRows),
      canSeeDashboardActivity
        ? supabaseBrowser.rpc("list_dashboard_activity", {
            p_establishment_id: establishmentId,
            p_since: activitySince.toISOString(),
            p_limit: 8,
          })
        : Promise.resolve({ data: [], error: null }),
    ])

    const results = [classes, teachers, staff, staffAttendance, pendingEnrollments, attendance, revenue, schoolEvents, activity]
    const failed = results.find((result: any) => result.error)
    if (failed?.error) throw new Error("Impossible de charger les indicateurs autorisés du tableau de bord.")

    const attendanceRows = (staffAttendance as any).data ?? []
    const presentStaff = new Set(
      attendanceRows
        .filter((row: any) => ["present", "late"].includes(String(row.status).toLowerCase()))
        .map((row: any) => `${row.staff_type}:${row.staff_id}`),
    )
    const attendanceStatuses = ((attendance as any).data ?? []).map((row: any) => String(row.status).toLowerCase())
    const revenueData = (revenue as any).data
    const revenueRow = Array.isArray(revenueData) ? revenueData[0] : revenueData
    const eventsData = (schoolEvents as any).data ?? []
    const activityData = (activity as any).data
    const recentActivity = Array.isArray(activityData) ? activityData : []

    return {
      activeClasses: (classes as any).count ?? 0,
      activeTeachers: (teachers as any).count ?? 0,
      activeStaff: ((staff as any).count ?? 0) + ((teachers as any).count ?? 0),
      staffPresent: presentStaff.size,
      staffAttendanceRecorded: attendanceRows.length,
      pendingEnrollments: (pendingEnrollments as any).count ?? 0,
      absences: attendanceStatuses.filter((status: string) => status === "absent").length,
      lateArrivals: attendanceStatuses.filter((status: string) => status === "late").length,
      justifiedAbsences: attendanceStatuses.filter((status: string) => status === "justified").length,
      monthlyReceipts: canSeeFinance ? Number(revenueRow?.total_in ?? 0) : null,
      upcomingEvents: eventsData,
      upcomingEventsCount: (schoolEvents as any).count ?? eventsData.length,
      recentActivity,
    }
  },

  // Échéances de la famille réellement dépassées pour le tableau de bord.
  async getOverdueSchedules(establishmentId: string, academicYearId: string, today: string) {
    const { data, error } = await supabaseBrowser.rpc("get_finance_student_payment_board", {
      p_establishment_id: establishmentId,
      p_academic_year_id: academicYearId,
      p_class_id: null,
      p_overdue_only: true,
      p_today: today,
    })

    if (error) throw new Error("Impossible de charger les échéances en retard.")
    return (data ?? []) as any[]
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

    if (sourceType === "organization_payment") {
      const { data: organizationPayment, error: organizationPaymentError } = await supabaseBrowser
        .from("organization_payments")
        .select("id, organization_id, academic_year_id, amount, payment_date, method, reference, notes")
        .eq("id", movement.source_id)
        .maybeSingle()

      if (organizationPaymentError) throw new Error("Impossible de charger le versement global de l'organisation.")
      if (!organizationPayment) return base

      const [organizationResult, yearResult] = await Promise.all([
        supabaseBrowser
          .from("sponsoring_organizations")
          .select("id, name")
          .eq("id", organizationPayment.organization_id)
          .maybeSingle(),
        supabaseBrowser
          .from("academic_years")
          .select("id, name")
          .eq("id", organizationPayment.academic_year_id)
          .maybeSingle(),
      ])

      return {
        ...base,
        kind: "organization_payment",
        organizationPayment,
        organization: organizationResult.data ?? null,
        academicYear: yearResult.data ?? null,
      }
    }

    if (sourceType === "student_payment" || sourceType.includes("payment")) {
      const { data, error } = await supabaseBrowser.rpc("get_finance_payment_details", {
        p_payment_id: movement.source_id,
      })
      if (error) throw new Error("Impossible de charger le détail du paiement.")
      if (!data) return base

      return {
        ...base,
        kind: "student_payment",
        payment: data.payment ?? null,
        enrollment: data.enrollment ?? null,
        student: data.student ?? null,
        schoolClass: data.schoolClass ?? null,
        academicYear: data.academicYear ?? null,
        allocations: data.allocations ?? [],
      }
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