import getRouterBasename from '@/lib/router';

import { Logo } from '@/components/Logo';
import UserNav from '@/components/header/UserNav';

export function CustomHeader() {
  const handleLogoClick = () => {
    // Use window.location.href to trigger full page reload,
    // which ensures AppWrapper's auth check runs and redirects to login if needed
    window.location.href = getRouterBasename() + '/';
  };

  return (
    <header role="banner" aria-label="Top navigation">
      <div className="brand">
        <div className="logo-img-container" onClick={handleLogoClick}>
          <Logo className="w-[50px]" />
        </div>
        <div className="brand-title">
          <p className="title" id="app-title">
            Foros Chatbot — Φορολογικός Βοηθός
          </p>
          <p className="tag">
            Αξιόπιστες απαντήσεις σχετικά με την ελληνική φορολογική νομοθεσία
          </p>
        </div>
      </div>
      <nav className="primary-nav" aria-label="Κύρια πλοήγηση">
        <a href="/guide" title="Guide">
          Οδηγός
        </a>
        <a href="/order" title="Subscribe">
          Συνδρομή
        </a>
        <a href="/about" title="About">
          Σχετικά
        </a>
      </nav>

      <div className="header-cta" role="region" aria-label="Ενέργειες">
        <UserNav />
      </div>
    </header>
  );
}
