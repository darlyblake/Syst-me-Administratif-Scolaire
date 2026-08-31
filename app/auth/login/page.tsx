import { redirect } from "next/navigation"

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuthLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/"

  redirect(`/connexion?redirectTo=${encodeURIComponent(redirectTo)}`)
}
