import { useState, type FormEvent } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LoginFormProps {
  email: string
  motDePasse: string
  erreur: string
  chargement: boolean
  espace: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onForgotPassword: () => void
}

export function LoginForm({
  email,
  motDePasse,
  erreur,
  chargement,
  espace,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form onSubmit={onSubmit} className="login-form-shell" noValidate>
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="login-field-label">
            Adresse email
          </label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="votre@ecole.fr"
            autoComplete="email"
            aria-invalid={Boolean(erreur)}
            className="h-12 rounded-xl border-[#D8E0DC] bg-[#F8FAF8] px-3.5 text-sm text-[#1F2925] shadow-none focus-visible:ring-[#3D5A4C]/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="login-field-label">
            Mot de passe
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={motDePasse}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(erreur)}
              className="h-12 rounded-xl border-[#D8E0DC] bg-[#F8FAF8] px-3.5 pr-11 text-sm text-[#1F2925] shadow-none focus-visible:ring-[#3D5A4C]/20"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-3 flex items-center text-[#66736D] transition hover:text-[#1F2925]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {erreur ? (
        <p role="alert" className="login-error-message">
          {erreur}
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-6 h-12 w-full rounded-xl bg-[#3D5A4C] text-sm font-medium text-white shadow-[0_10px_22px_rgba(61,90,76,0.18)] transition hover:bg-[#2F463B] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={chargement}
      >
        {chargement ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion...
          </span>
        ) : (
          "Se connecter"
        )}
      </Button>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-[#3D5A4C] transition hover:text-[#2F463B] hover:underline"
        >
          Mot de passe oublié ?
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-[#D8E0DC] bg-[#F4F6F5] px-3 py-2 text-center text-xs text-[#66736D]">
        Espace sélectionné : <span className="font-medium text-[#1F2925]">{espace}</span>
      </div>
    </form>
  )
}
