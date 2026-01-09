import { UserPaymentInfo } from '@/schemas/interface';
import { SearchParamsSchema } from '@/schemas/redirectSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import { ProviderButton } from '@/components/ProviderButton';

import { useQuery } from 'hooks/query';

export default function OrderSuccess() {
  const { data: config, user } = useAuth();
  const query: URLSearchParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const oAuthReady = config?.oauthProviders.length;
  const providers = config?.oauthProviders || [];
  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);
  const { t: translation } = useTranslation();

  //  Handle payment callbacks and failure states
  // should run once on mount, and whenever query or user changes
  useEffect(() => {
    const paymentResultController = new AbortController();
    const result = SearchParamsSchema.safeParse(Object.fromEntries(query));
    if (!result.success) return;

    const { t, s, eventId, eci, orderFailed } = result.data;

    if (orderFailed) {
      console.log('Payment failed or was cancelled.');
      toast.error(translation('payments.errors.paymentFailed'));
      return;
    }
    const isPaymentCallback = t && s && eventId && eci ? true : false;
    if (!orderFailed && isPaymentCallback) {
      console.log('Transaction ID:', t);
      console.log('Order Code:', s);
      console.log('Event ID:', eventId);
      console.log('ECI:', eci);

      // we check the database only for logged in users to match their transactions

      // checking for user presence is not needed because the page is not accessible
      // without logging in first (see AppWrapper.tsx)

      // if (!user) {
      //   toast.warning(
      //     'We need you to log in first to process the payment result.'
      //   );
      //   setTimeout(() => {
      //     onOAuthSignIn(providers[0]);
      //   }, 2000);
      //   return;
      // }

      (async () => {
        setLoading(true);
        // NOTE: we use try because the apiClient throws an error if the response is not ok!!!
        try {
          // this is an internal request to our database
          // it will throw if there was an sql error
          // it will return an empty transaction if not found
          const response = await apiClient.get(
            `/transaction?transaction_id=${t}&order_code=${s}`
          );
          const transaction: UserPaymentInfo = await response.json();
          console.log('Transaction details:', transaction);
          if (
            // check if the transaction is emtpy object shell
            // this means that the transaction was not found in our database
            Object.keys(transaction).length === 0
          ) {
            toast.error(translation('payments.errors.webhookMissing'));
            const payment_request_payload: Partial<UserPaymentInfo> = {
              user_id: user?.identifier,
              transaction_id: t as string,
              order_code: s as string,
              event_id: Number(eventId),
              eci: Number(eci),
              // we have to provide an amount to match the pydantic model, but we don't know it here
              amount: 5 // set a default or fetch from another source
            };
            // this makes an external request to get the transaction from Viva Payments
            // and then store it in our database via the backend
            // if the transaction doesn't exist, Viva payments will return an error 404
            // FastAPI backend returns the error message from Viva Payments
            // we have to catch that error and show a message to the user
            const payment_response = await apiClient.post(
              `/payment`,
              payment_request_payload,
              paymentResultController.signal
            );
            if (payment_response.status === 201) {
              toast.success(translation('payments.success'));
            } else {
              toast.info(translation('payments.info.paymentExists'));
            }
          }
          // if we reach here, payment was processed successfully
          // update UI state
          setSuccess(true);
          // go back to home after 2 seconds
          setTimeout(() => {
            window.location.replace('/');
          }, 2000);
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
    <div className="custom-pg">
      <main className="wrap inline" role="main" aria-label="payment-success">
        <CustomHeader />

        <div className="flex flex-col items-center justify-center py-12 px-4">
          {loading ? (
            // Loading state
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              <p className="text-lg text-gray-700 font-medium">
                {translation('payments.processing')}
              </p>
              <p className="text-sm text-gray-500">
                {translation('payments.pleaseWait')}
              </p>
            </div>
          ) : success ? (
            // Success state
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-green-600">
                {translation('payments.success')}
              </h1>
              <p className="text-gray-600 text-lg">
                {translation('payments.thankYou')}
              </p>
              <p className="text-sm text-gray-500">
                {translation('payments.redirecting')}
              </p>
            </div>
          ) : (
            // Ready to pay state
            <div className="flex flex-col items-center gap-6">
              {user ? (
                <div className="flex flex-col items-center gap-2">
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
                  <h1 className="text-2xl font-bold text-gray-800">
                    {translation('payments.errors.paymentFailed')}
                  </h1>
                  {/* <p className="text-gray-600">
                    {translation('payments.loggedInAs')}{' '}
                    <span className="font-medium">{user.identifier}</span>
                  </p> */}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800">
                    {translation('auth.provider.continue')}
                  </h1>

                  {oAuthReady && (
                    <div className="grid gap-3 w-full">
                      {providers.map((provider, index) => (
                        <ProviderButton
                          key={`provider-${index}`}
                          provider={provider}
                          onClick={() => onOAuthSignIn?.(provider)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
