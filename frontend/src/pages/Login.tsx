import { BookOpen, MessageSquare } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BotSim from '@/components/BotSim';
import ChipList from '@/components/Chiplist';
import CustomFooter from '@/components/CustomFooter';
import { CustomHeader } from '@/components/CustomHeader';
import { LoginForm } from '@/components/LoginForm';

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
      <main className="wrap" role="main" aria-label="app-title">
        <CustomHeader />
        <div className="features" aria-hidden="false">
          <div className="card card--left" aria-labelledby="features-title">
            <span className="inline-flex mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <strong id="features-title" className="ml-2 leading-none">
                Γιατί όχι απλά ένα ChatBot;
              </strong>
            </span>
            <ul className="features-list" role="list">
              <li role="listitem">
                Αναζήτηση στη βιβλιοθήκη εγγράφων της ΑΑΔΕ, όχι στη γενική γνώση
                ενός AI μοντέλου.
                <span className="meta">
                  Υβριδική αναζήτηση (σημασιολογική + λέξεις-κλειδιά) σε
                  χιλιάδες νόμους, εγκυκλίους και αποφάσεις.
                </span>
              </li>
              <li role="listitem">
                Βελτιστοποίηση ερώτησης - δημιουργία πολλαπλών παραλλαγών για
                πληρέστερα αποτελέσματα.
                <span className="meta">
                  Αυτόματη μετατροπή της ερώτησης σε 5 εναλλακτικές μορφές για
                  καλύτερη κάλυψη.
                </span>
              </li>
              <li role="listitem">
                Έξυπνη κατάταξη με AI - επιλογή των 10 πιο σχετικών από τα
                συνολικά αποτελέσματα.
                <span className="meta">
                  Reranking με εξειδικευμένο μοντέλο για υψηλή ακρίβεια.
                </span>
              </li>
            </ul>
          </div>

          <div
            className="card"
            style={{ paddingTop: '5px' }}
            aria-labelledby="samples-title"
          >
            <BotSim inputRef={inputRef} />
            <span className="inline-flex mt-4 pt-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <strong id="samples-title" className="ml-2 leading-none">
                Δείγματα ερωτήσεων
              </strong>
            </span>
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
      </main>
      <CustomFooter />
    </div>
  );
}
