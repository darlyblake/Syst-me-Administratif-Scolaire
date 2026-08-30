export function LoginAnimation() {
  return (
    <div className="login-book-scene" aria-hidden="true">
      <div className="login-book-glow" />
      <div className="login-book-shell">
        <div className="login-book-rail" />
        <div className="login-book-ribbon" />
        <div className="login-book">
          <div className="login-book-cover">
            <div className="login-book-emblem">
              <span>ÉC</span>
            </div>
            <div className="login-book-brand">École Connect</div>
            <div className="login-book-tag">Gestion scolaire</div>
            <div className="login-book-actions">
              <span className="login-book-button login-book-button-primary">Connexion</span>
              <span className="login-book-button login-book-button-secondary">Créer un compte</span>
            </div>
          </div>
          <div className="login-book-page login-book-page-front">
            <div className="login-book-header">Établissement</div>
            <div className="login-book-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="login-book-stats">
              <div>
                <strong>1 284</strong>
                <small>Élèves</small>
              </div>
              <div>
                <strong>76</strong>
                <small>Enseignants</small>
              </div>
              <div>
                <strong>42</strong>
                <small>Classes</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
