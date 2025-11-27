import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BotSim from '@/components/BotSim';
import ChipList from '@/components/Chiplist';
import { LoginForm } from '@/components/LoginForm';
import { Logo } from '@/components/Logo';

import { useQuery } from 'hooks/query';

import { ChainlitContext, useAuth } from 'client-types/*';

export const LoginError = new Error(
  'Error logging in. Please try again later.'
);

export default function Login() {
  const query = useQuery();
  const { data: config, user, setUserFromAPI } = useAuth();
  const [error, setError] = useState('');
  const apiClient = useContext(ChainlitContext);
  const navigate = useNavigate();

  const inputRef = useRef<HTMLDivElement>(null);

  const handleCookieAuth = (json: any): void => {
    if (json?.success != true) throw LoginError;

    // Validate login cookie and get user data.
    setUserFromAPI();
  };

  const handleAuth = async (
    jsonPromise: Promise<any>,
    redirectURL?: string
  ) => {
    try {
      const json = await jsonPromise;

      handleCookieAuth(json);

      if (redirectURL) {
        navigate(redirectURL);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleHeaderAuth = async () => {
    const jsonPromise = apiClient.headerAuth();

    // Why does apiClient redirect to '/' but handlePasswordLogin to callbackUrl?
    await handleAuth(jsonPromise, '/');
  };

  const handlePasswordLogin = async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const jsonPromise = apiClient.passwordAuth(formData);
    await handleAuth(jsonPromise);
  };

  useEffect(() => {
    setError(query.get('error') || '');
  }, [query]);

  useEffect(() => {
    if (!config) {
      return;
    }
    if (!config.requireLogin) {
      navigate('/');
    }
    if (config.headerAuth && !user) {
      handleHeaderAuth();
    }
    if (user) {
      navigate('/');
    }
  }, [config, user]);

  return (
    <div className="custom-pg">
      <main className="wrap" role="main" aria-labelledby="app-title">
        <header role="banner" aria-label="Top navigation">
          <div className="brand">
            <div className="logo-img-container">
              <Logo className="w-[50px]" />
            </div>
            <div className="brand-title">
              <p className="title" id="app-title">
                Foros Chatbot — Φορολογικός Βοηθός
              </p>
              <p className="tag">
                Αξιόπιστες απαντήσεις σχετικά με την ελληνική φορολογική
                νομοθεσία
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

          <div
            className="header-cta"
            role="region"
            aria-label="Ενέργειες"
          ></div>
        </header>
        <div className="features" aria-hidden="false">
          <div className="card card--left" aria-labelledby="features-title">
            <strong id="features-title">Τι κάνει η εφαρμογή</strong>
            <ul className="features-list" role="list">
              <li role="listitem">
                Αναζητά τεκμήρια και απαντά με βάση την ελληνική φορολογική
                νομοθεσία.
                <span className="meta">
                  Αναζήτηση στο σύνολο των εγγράφων και σύνοψη απάντησης.
                </span>
              </li>
              <li role="listitem">
                Υποστηρίζει προβολή συνδέσμων προς αρχεία PDF που
                χρησιμοποιήθηκαν ως πηγές.
                <span className="meta">
                  Ανοίγει PDF σε νέα καρτέλα για αναφορά.
                </span>
              </li>
              <li role="listitem">
                Προστατευμένη πρόσβαση (πρέπει να συνδεθείτε για πλήρη
                λειτουργικότητα).
                <span className="meta">
                  Συνεργασία με Auth0 / OAuth για έλεγχο ταυτότητας.
                </span>
              </li>
            </ul>
          </div>

          <div className="card" aria-labelledby="samples-title">
            <BotSim inputRef={inputRef} />
            <strong id="samples-title" className="mt-4">
              Δείγματα ερωτήσεων
            </strong>
            <ChipList
              callbackUrl="/"
              providers={config?.oauthProviders || []}
              inputref={inputRef}
              onOAuthSignIn={async (provider: string) => {
                window.location.href = apiClient.getOAuthEndpoint(provider);
              }}
            />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              error={error}
              callbackUrl="/"
              providers={config?.oauthProviders || []}
              onPasswordSignIn={
                config?.passwordAuth ? handlePasswordLogin : undefined
              }
              onOAuthSignIn={async (provider: string) => {
                window.location.href = apiClient.getOAuthEndpoint(provider);
              }}
            />
          </div>
        </div>
        <footer>
          <div>Ανάπτυξη · Φορολογικός Βοηθός — Foros Chatbot</div>
        </footer>
      </main>
    </div>
  );
}
