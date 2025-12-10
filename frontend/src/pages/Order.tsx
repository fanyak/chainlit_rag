import {
  BaseOrderRequestSchema,
  GuestOrderRequest,
  GuestOrderRequestSchema,
  amountType,
  searchParamsSchema
} from '@/schemas/orderSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// import Page from 'pages/Page';
import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import PaymentPlants from '@/components/PaymentPlants';
import { ProviderButton } from '@/components/ProviderButton';

import { useQuery } from 'hooks/query';

interface TransactionResponse {
  transaction_id: string;
  order_code: string;
  user_id: string;
  event_id: number;
  eci: number;
  created_at: string;
}

export default function Order() {
  const { data: config, user } = useAuth();
  const query: URLSearchParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const oAuthReady = config?.oauthProviders.length;
  const providers = config?.oauthProviders || [];
  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

  const createGuestOrderUrl = useCallback((amount: amountType) => {
    const baseUrl = new URL(
      `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    );
    const searchParams = new URLSearchParams();
    const guestData: GuestOrderRequest = {
      amount: amount,
      createdAt: Date.now()
    };
    for (const [key, value] of Object.entries(guestData)) {
      searchParams.append(key, value.toString());
    }
    baseUrl.search = searchParams.toString();
    window.location.replace(baseUrl.toString());
  }, []);
  //because this is also in useEffect, we memoize it to avoid recreating the function on each render
  // this will run twice on mount in dev mode but only once in production
  const handleCreateOrder = useCallback(
    async (amount: amountType = 1000) => {
      if (error) {
        setError(null);
        return;
      }
      if (!user) {
        toast.error('You must be logged in to create an order');
        // save the amount the user wanted to pay in the URL so we can use it after login
        return createGuestOrderUrl(amount);
      }
      setLoading(true);
      // use try because the apiClient throws an error if the response is not ok!!!
      try {
        const response = await apiClient.post('/order', {
          amount_cents: amount
        }); // 10 euros in cents
        const data = await response.json();
        //Note:  we don't need to check if orderCode is present in the response
        // because it is done in the backend (order.py) and it raises an Error Response if not
        const orderCode = data.orderCode;
        toast.success('Redirecting to payment page...');

        // Redirect to Viva Payments Smart Checkout
        // Use demo URL for testing, change to production URL when going live
        const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${orderCode}`;
        // For production: const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${data.orderCode}`;

        // Redirect after a short delay to show the success message
        // Using replace() instead of href to prevent back navigation and duplicate orders
        setTimeout(() => {
          window.location.replace(checkoutUrl);
        }, 1000);

        setOrderCode(orderCode);
      } catch (error: any) {
        // The apiClient throws an error if the response is not ok (it is an HTTP error response)!!!
        // it also shows a toast with the error message
        // so no need to show another toast here
        setError(error.message);
        console.error('Error creating order:', error);
      } finally {
        // update state
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    // let t: string | null = null;
    // let s: string | null = null;
    // let eventId: string | null = null;
    // let eci: string | null = null;
    // let failure: string | null = null;
    // let amount: string | null = null;
    // Capture URL parameters on mount

    //@Note: query: URLSearchParams is an iterable because
    // it has a [Symbol.iterator]() method that is assigned the entries() method
    const result = searchParamsSchema.safeParse(Object.fromEntries(query));

    if (!result.success) {
      console.error('Error parsing URL parameters:', result.error.errors);
      return;
    }
    const { t, s, eventId, eci, failure, amount, createdAt } = result.data;
    // try {
    //   t = query.get('t');
    //   s = query.get('s');
    //   //const lang = query.get('lang');
    //   eventId = query.get('eventId');
    //   eci = query.get('eci');
    //   failure = query.get('failure');
    //   amount = query.get('amount');
    // } catch (error) {
    //   console.error('Error parsing URL parameters:', error);
    // }
    if (BaseOrderRequestSchema.safeParse({ amount: amount }).success) {
      if (!user) {
        // the 'transition search param will be removed by the server.py after authentication
        // because it is not in the list of allowed parameters handled by the login callback
        toast.warning('We need you to log in first.');

        // Validate guest order request using Zod schema
        const guestOrderResult = GuestOrderRequestSchema.safeParse({
          amount: amount,
          createdAt: createdAt
        });

        if (guestOrderResult.success) {
          setTimeout(() => {
            onOAuthSignIn(providers[0]);
          }, 2000);
        } else {
          // URL is expired or invalid
          console.warn(
            'Guest order validation failed:',
            guestOrderResult.error.errors
          );
          toast.error('Your request has expired. Please try again.');
        }
        return;
      } else {
        toast.success('we are creating your order now...');
        handleCreateOrder(amount as amountType);
      }
    }
    if (failure) {
      console.log('Payment failed or was cancelled.');
      toast.error('Payment failed or was cancelled.');
    }
    const isPaymentCallback = t && s && eventId && eci ? true : false;
    if (!failure && isPaymentCallback) {
      console.log('Transaction ID:', t);
      console.log('Order Code:', s);
      console.log('Event ID:', eventId);
      console.log('ECI:', eci);

      (async () => {
        // the apiClient throws an error if the response is not ok!!!
        try {
          const response = await apiClient.get(
            `/transaction?transaction_id=${t}&order_code=${s}`
          );
          const transaction: TransactionResponse = await response.json();
          console.log('Transaction details:', transaction);
          // if (transaction.user_id !== user?.identifier) {
          //   toast.error('Failed to verify payment user.');
          //   return;
          // }
          if (
            transaction.transaction_id !== t ||
            transaction.order_code !== s
          ) {
            toast.error('Payment was not successful.');
            return;
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
        }
      })();
    }
  }, [query, handleCreateOrder, user, onOAuthSignIn]); // so this runs once on mount and if queryParameters change

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

        {orderCode && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg space-y-2">
            <p className="text-green-800 font-semibold">Order Created!</p>
            <p className="text-sm text-gray-700">Order Code:</p>
            <code className="block bg-white p-2 rounded border text-sm text-gray-900">
              {orderCode}
            </code>
          </div>
        )}
        <PaymentPlants
          createOrder={handleCreateOrder}
          user={user}
          loading={loading}
        />
      </main>
    </div>
  );
}
