import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoginForm } from '@/components/LoginForm';
import { Logo } from '@/components/Logo';

//import { useTheme } from '@/components/ThemeProvider';
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
  // const { variant } = useTheme();
  //const isDarkMode = variant === 'dark';

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
    if (config.headerAuth) {
      handleHeaderAuth();
    }
    if (user) {
      navigate('/');
    }
  }, [config, user]);

  return (
    <main className="wrap" role="main" aria-labelledby="app-title">
      <header className="header" role="banner" aria-label="Top navigation">
        <div className="brand">
          <div className="logo-img-container">
            <Logo className="w-[60px]" />
          </div>
          <div className="brand-title">
            <p className="title" id="app-title">
              Foros Chatbot — Φορολογικός Βοηθός
            </p>
            <p className="tag">
              Αξιόπιστες απαντήσεις στις ερωτήσεις για την ελληνική φορολογική
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

        <div className="header-cta" role="region" aria-label="Ενέργειες">
          {/* <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            id="openChatBtn"
                            className="btn"
                            type="button"
                            disabled
                        >
                            Άνοιγμα συνομιλίας
                        </button>
                        <button
                            id="loginBtn"
                            class="btn secondary"
                            type="button"
                        >
                            Σύνδεση
                        </button> 
          </div>*/}
        </div>
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
              Υποστηρίζει προβολή συνδέσμων προς αρχεία PDF που χρησιμοποιήθηκαν
              ως πηγές.
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
          <strong id="samples-title">Γρήγορα δείγματα</strong>

          <div className="sample-questions" id="samples" role="list">
            <button
              className="chip"
              type="button"
              role="listitem"
              aria-label="Δείγμα: Πώς υποβάλλεται ο πίνακας προσωπικού;"
            >
              Πώς υποβάλλεται ο πίνακας προσωπικού;
            </button>
            <button
              className="chip"
              type="button"
              role="listitem"
              aria-label="Δείγμα: Πότε ισχύει η απαλλαγή ΦΠΑ για μικρές επιχειρήσεις;"
            >
              Πότε ισχύει η απαλλαγή ΦΠΑ για μικρές επιχειρήσεις;
            </button>
            <button
              className="chip"
              type="button"
              role="listitem"
              aria-label="Δείγμα: Τι ισχύει για τη φορολογία μισθωτών υπηρεσιών;"
            >
              Τι ισχύει για τη φορολογία μισθωτών υπηρεσιών;
            </button>
            <button
              className="chip"
              type="button"
              role="listitem"
              aria-label="Δείγμα: Πηγή 2020_2120 885 2025.pdf"
            >
              Πηγή: 2020_2120\885_2025.pdf
            </button>
          </div>

          <form
            className="search-box"
            // onSubmit="return false;"
            aria-label="Quick question"
          >
            <label htmlFor="quickQuery" className="sr-only">
              Ερώτηση αναζήτησης
            </label>
            <div id="quickQuery" contentEditable="true" aria-label="Ερώτηση" />
            <button id="askBtn" className="small ghost" type="button">
              Ρώτα
            </button>
          </form>

          <div
            style={{
              marginTop: '12px',
              color: 'var(--muted)',
              fontSize: '13px'
            }}
          >
            Παραδείγματα ερωτήσεων για να ξεκινήσετε. Επιλέξτε ή πληκτρολογήστε
            και πατήστε "Ρώτα".
          </div>
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
        <div style={{ marginTop: '16px', color: 'var(--muted)' }}>
          Ανάπτυξη · Φορολογικός Βοηθός — Foros Chatbot
        </div>
      </footer>
    </main>
    // <div className="grid min-h-svh lg:grid-cols-2">
    //   <div className="flex flex-col gap-4 p-6 md:p-10">
    //     <div className="flex justify-center gap-2 md:justify-start">
    //       <Logo className="w-[60px]" />
    //     </div>
    //     <div className="flex flex-1 items-center justify-center">
    //       <div className="w-full max-w-xs">
    //         <LoginForm
    //           error={error}
    //           callbackUrl="/"
    //           providers={config?.oauthProviders || []}
    //           onPasswordSignIn={
    //             config?.passwordAuth ? handlePasswordLogin : undefined
    //           }
    //           onOAuthSignIn={async (provider: string) => {
    //             window.location.href = apiClient.getOAuthEndpoint(provider);
    //           }}
    //         />
    //       </div>
    //     </div>
    //   </div>
    //   {!config?.headerAuth ? (
    //     <div className="relative hidden bg-muted lg:block overflow-hidden">
    //       <img
    //         src={
    //           config?.ui?.login_page_image ||
    //           apiClient.buildEndpoint('/favicon')
    //         }
    //         alt="Image"
    //         className={`absolute inset-0 h-full w-full object-cover ${
    //           isDarkMode
    //             ? config?.ui?.login_page_image_dark_filter ||
    //               'brightness-[0.2] grayscale'
    //             : config?.ui?.login_page_image_filter || ''
    //         }`}
    //       />
    //     </div>
    //   ) : null}
    // </div>
  );
}
