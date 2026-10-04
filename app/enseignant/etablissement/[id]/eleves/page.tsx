"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function TeacherStudentsRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => { if (id) router.replace("/enseignant/etablissement/" + id + "/classes") }, [id, router])
  return null
}
