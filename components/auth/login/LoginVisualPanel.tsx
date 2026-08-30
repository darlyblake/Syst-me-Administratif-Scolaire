import { LoginAnimation } from "@/components/auth/login/LoginAnimation"

export function LoginVisualPanel() {
  return (
    <aside className="login-visual-panel">
      <div className="login-visual-header">
        <div className="login-brand-mark">
          <span>ÉC</span>
        </div>
        <div>
          <p className="login-brand-name">École Connect</p>
          <p className="login-brand-subtitle">Système de gestion scolaire</p>
        </div>
      </div>

      <div className="login-visual-copy">
        <span className="login-eyebrow">Gestion scolaire</span>
        <h2>Un accès rapide à l&apos;information de votre établissement.</h2>
      </div>

      <LoginAnimation />
    </aside>
  )
}
