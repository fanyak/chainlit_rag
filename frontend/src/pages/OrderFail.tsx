import { SearchParamsSchema } from '@/schemas/redirectSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// import Page from 'pages/Page';
import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import { ProviderButton } from '@/components/ProviderButton';

import { useQuery } from 'hooks/query';

export default function OrderFail() {
  const { data: config, user } = useAuth();
  const query: URLSearchParams = useQuery();
  const [loading, setLoading] = useState(false);
  const oAuthReady = config?.oauthProviders.length;
  const providers = config?.oauthProviders || [];
  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

  //  Handle payment callbacks and failure states
  // should run once on mount, and whenever query or user changes
  useEffect(() => {
    const result = SearchParamsSchema.safeParse(Object.fromEntries(query));
    if (!result.success) return;

    const { orderFailed } = result.data;

    if (orderFailed) {
      console.log('Payment failed or was cancelled.');
      toast.error('Payment failed or was cancelled.');
      setLoading(false);
      return;
    }
  }, [query, user]); // Runs when query or user changes

  return (
    <div className="custom-pg flex flex-col items-center justify-center h-full w-full">
      <main className="wrap" role="main" aria-label="app-title">
        <CustomHeader />

        {user ? (
          // <div className="bg-gray-100 p-4 rounded-lg">
          //   <p className="text-sm text-gray-600">Logged in as:</p>
          //   <p className="font-semibold text-gray-600">{user.identifier}</p>
          // </div>
          <h1 className="text-3xl font-bold">
            Παραγγείλετε μέσω της Viva Payment
          </h1>
        ) : (
          (oAuthReady && (
            <div className="grid gap-2">
              {providers.map((provider, index) => (
                <ProviderButton
                  key={`provider-${index}`}
                  provider={provider}
                  onClick={() => onOAuthSignIn?.(provider)}
                />
              ))}
            </div>
          )) ||
          null
        )}

        {/* <button
          onClick={handleCreateOrder}
          disabled={loading || !user}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        > */}

        {loading ? 'Creating Order...' : 'Create Order'}
        {/* </button> */}

        {/* <PaymentPlants
          createOrder={handleCreateOrder}
          user={user}
          loading={loading}
        /> */}
      </main>
    </div>
  );
}
