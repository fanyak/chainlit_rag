import getRouterBasename from '@/lib/router';
import { apiClient } from 'api';
import { LogIn, MessageSquare } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useAuth } from '@chainlit/react-client';

import { Logo } from '@/components/Logo';
import UserNav from '@/components/header/UserNav';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-button-spinner';

import { useResetOnPageRestore } from '@/hooks/useResetOnPageRestore';

export function CustomHeader() {
  const { user, data: config } = useAuth();
  const [isLogging, setIsLogging] = useState(false);

  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

  const handleLogoClick = () => {
    // Use window.location.href to trigger full page reload,
    // which ensures AppWrapper's auth check runs and redirects to login if needed
    window.location.href = getRouterBasename() + '/';
  };

  const onChatClick = () => {
    if (!user) {
      setIsLogging(true);
      if (window.location.pathname.startsWith('/order')) {
        window.history.pushState({}, '', getRouterBasename() + '/');
      }
      onOAuthSignIn(config?.oauthProviders[0] || '');
    } else {
      handleLogoClick();
    }
  };

  // Reset loading state when page is restored from bfcache (browser back button)
  useResetOnPageRestore(() => setIsLogging(false));

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
        {/* <a href={user ? "/" : "/login"} title="Chat with Foro">
          Ρωτήστε τον Foro
        </a> */}

        <Button onClick={onChatClick} variant="link" disabled={isLogging}>
          {isLogging ? (
            <span className="inline-flex items-center bg-gray-200 p-2 rounded-sm">
              <LoadingSpinner color="var(--accentb)" />
              <span>Σύνδεση...</span>
            </span>
          ) : (
            <span className="inline-flex items-center">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="ml-1">Ρωτήστε τώρα τον Foro</span>
            </span>
          )}
          {/* Ρωτήστε τον Foro */}
        </Button>

        <a href="/order" title="Packages">
          Πακέτα tokens
        </a>
        <a href="/contact" title="Contact">
          Επικοινωνία
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
