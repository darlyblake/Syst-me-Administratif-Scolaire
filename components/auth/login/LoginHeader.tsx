interface LoginHeaderProps {
  espaceLabel: string
}

export function LoginHeader({ espaceLabel }: LoginHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#D8E0DC] bg-[#F4F6F5] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3D5A4C]">
        <span className="h-2 w-2 rounded-full bg-[#3D5A4C]" />
        Connexion
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1F2925] sm:text-[2rem]">
          {espaceLabel}
        </h1>
        <p className="text-sm leading-6 text-[#66736D]">
          Utilisez votre adresse email et votre mot de passe pour accéder à votre espace de gestion.
        </p>
      </div>
    </div>
  )
}
