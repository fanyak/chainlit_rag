import { SearchParamsSchema } from '@/schemas/redirectSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import { ProviderButton } from '@/components/ProviderButton';

import { useQuery } from 'hooks/query';

export default function OrderFail() {
  const { data: config, user } = useAuth();
  const query: URLSearchParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const oAuthReady = config?.oauthProviders.length;
  const providers = config?.oauthProviders || [];
  const { t } = useTranslation();
  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

  const handleRetry = useCallback(() => {
    window.location.href = '/order';
  }, []);

  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  //  Handle payment callbacks and failure states
  // should run once on mount, and whenever query or user changes
  useEffect(() => {
    const result = SearchParamsSchema.safeParse(Object.fromEntries(query));
    if (!result.success) return;

    const { orderFailed } = result.data;

    if (orderFailed) {
      console.log(t('payments.errors.paymentFailed'));
      setLoading(false);
      setFailureReason(t('payments.errors.paymentFailed'));
      toast.error(t('payments.errors.paymentFailed'));
      return;
    }
  }, [query, user]); // Runs when query or user changes

  return (
    <div className="custom-pg">
      <main className="wrap inline" role="main" aria-label="payment-success">
        <CustomHeader />

        <div className="flex flex-col items-center justify-center py-12 px-4">
          {loading ? (
            // Loading state
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
              <p className="text-lg text-gray-700 font-medium">
                {t('payments.processing')}...
              </p>
              <p className="text-sm text-gray-500">
                {t('payments.pleaseWait')}
              </p>
            </div>
          ) : (
            // Failure state
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-red-600 mb-2">
                  {t('payments.errors.paymentFailed')}
                </h1>
                <p className="text-gray-700 text-base mb-3">
                  {failureReason || t('payments.errors.reason.fallback')}
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 w-full text-left">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Τί μπορείτε να κάνετε;</span>
                  <ul className="mt-2 space-y-1 ml-2">
                    <li>• Ελέγξε τη κάρτα σας και ξαναδοκιμάστε</li>
                    <li>• Δοκιμάστε διαφορετικό τρόπο πληρωμής</li>
                    <li>
                      • Επικοινώνηστε με την τράπεζά σας αν το πρόβλημα
                      παραμένει
                    </li>
                  </ul>
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full pt-4">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('payments.retry')}
                </button>
                <button
                  onClick={handleGoHome}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('common.actions.goBack')}
                </button>
              </div>

              {!user && oAuthReady && (
                <div className="pt-6 border-t w-full">
                  <p className="text-sm text-gray-600 mb-4">
                    {t('auth.login.title')}
                  </p>
                  <div className="grid gap-3">
                    {providers.map((provider, index) => (
                      <ProviderButton
                        key={`provider-${index}`}
                        provider={provider}
                        onClick={() => onOAuthSignIn?.(provider)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
