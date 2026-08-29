export interface Grade {
  id: string
  establishment_id: string
  student_id: string
  subject: string
  term: "1" | "2" | "3" | string
  score: number
  max_score?: number
  appreciation?: string | null
  teacher_id?: string | null
  recorded_date?: string
  created_at?: string
  updated_at?: string
}

export interface GradeWithStudent extends Grade {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface ClassGradesSummary {
  class_id: string
  subject: string
  term: string
  average_score: number
  highest_score: number
  lowest_score: number
  student_count: number
}
