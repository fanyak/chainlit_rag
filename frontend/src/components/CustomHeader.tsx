import getRouterBasename from '@/lib/router';
import { apiClient } from 'api';
import { LogIn } from 'lucide-react';
import { useCallback } from 'react';

import { useAuth } from '@chainlit/react-client';

import { Logo } from '@/components/Logo';
import UserNav from '@/components/header/UserNav';
import { Button } from '@/components/ui/button';

export function CustomHeader() {
  const { user, data: config } = useAuth();

  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

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
        {user ? (
          <UserNav />
        ) : (
          <Button
            onClick={() => onOAuthSignIn(config?.oauthProviders[0] || '')}
            variant="ghost"
            size="icon"
          >
            <LogIn className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
