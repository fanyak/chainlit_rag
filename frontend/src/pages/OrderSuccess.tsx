import { CreatePaymentResponse, UserPaymentInfo } from '@/schemas/interface';
import { SearchParamsSchema } from '@/schemas/redirectSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// import Page from 'pages/Page';
import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import { ProviderButton } from '@/components/ProviderButton';

import { useQuery } from 'hooks/query';

export default function OrderSuccess() {
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
    const paymentResultController = new AbortController();
    const result = SearchParamsSchema.safeParse(Object.fromEntries(query));
    if (!result.success) return;

    const { t, s, eventId, eci, orderFailed } = result.data;

    if (orderFailed) {
      console.log('Payment failed or was cancelled.');
      toast.error('Payment failed or was cancelled.');
      return;
    }
    const isPaymentCallback = t && s && eventId && eci ? true : false;
    if (!orderFailed && isPaymentCallback) {
      console.log('Transaction ID:', t);
      console.log('Order Code:', s);
      console.log('Event ID:', eventId);
      console.log('ECI:', eci);

      // we check the database only for logged in users to match their transactions
      if (!user) {
        toast.warning(
          'We need you to log in first to process the payment result.'
        );
        setTimeout(() => {
          onOAuthSignIn(providers[0]);
        }, 2000);
        return;
      }
      // TODO: add fallback if the webhook has not yet processed the transaction
      (async () => {
        setLoading(true);
        // NOTE: we use try because the apiClient throws an error if the response is not ok!!!
        try {
          // this is an internal request to our database
          const response = await apiClient.get(
            `/transaction?transaction_id=${t}&order_code=${s}`
          );
          const transaction: UserPaymentInfo = await response.json();
          console.log('Transaction details:', transaction);
          if (
            //NOTE: check if the transaction is empty and doesn't match the query params
            !transaction.transaction_id ||
            !transaction.order_code
          ) {
            toast.error('Checking if Webhook was not received');
            const payment_payload: Partial<UserPaymentInfo> = {
              user_id: user.identifier,
              transaction_id: t as string,
              order_code: s as string,
              event_id: Number(eventId),
              eci: Number(eci),
              amount: 5 // amount is unknown here, set a default or fetch from another source
            };
            // this is an external request to get the transaction from Viva Payments
            const transaction_fallback = await apiClient.post(
              `/payment`,
              payment_payload,
              paymentResultController.signal
            );
            const payment_res: CreatePaymentResponse =
              await transaction_fallback.json();
            if (!payment_res.id || !payment_res.balance) {
              toast.error('Payment processing failed in Fallback!');
              return;
            }
          }
          toast.success('Payment processed successfully!');

          // go back to home after 1 second
          setTimeout(() => {
            window.location.replace('/');
          }, 1000);
        } catch (error) {
          // the apiClient throws an error if the response is not ok!!!
          // it also shows a toast with the error message
          // so no need to show another toast here
          console.error('Error processing payment:', error);
        } finally {
          setLoading(false);
        }
      })();
    }
    return () => {
      paymentResultController.abort();
    };
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
