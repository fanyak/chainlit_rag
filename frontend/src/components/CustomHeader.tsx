import { useNavigate } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import UserNav from '@/components/header/UserNav';

export function CustomHeader() {
  const navigate = useNavigate();

  return (
    <header role="banner" aria-label="Top navigation">
      <div className="brand">
        <div className="logo-img-container" onClick={() => navigate('/')}>
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
        <a href="/spec" title="Προδιαγραφή">
          Προδιαγραφή
        </a>
        <a href="/guide" title="Οδηγός">
          Οδηγός
        </a>
        <a href="/examples" title="Παραδείγματα">
          Παραδείγματα
        </a>
        <a href="/about" title="Περί">
          Περί
        </a>
      </nav>

      <div className="header-cta" role="region" aria-label="Ενέργειες">
        <UserNav />
      </div>
    </header>
  );
}
