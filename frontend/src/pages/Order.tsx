import {
  AmountType,
  GuestOrderRequest,
  GuestOrderRequestSchema,
  SearchParamsSchema,
  StaleGuestOrderRequestSchema
} from '@/schemas/redirectSchema';
import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// import Page from 'pages/Page';
import { useAuth } from '@chainlit/react-client';

import { CustomHeader } from '@/components/CustomHeader';
import PaymentPlants from '@/components/PaymentPlants';
import { ProviderButton } from '@/components/ProviderButton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { useQuery } from 'hooks/query';

export default function Order() {
  const { data: config, user } = useAuth();
  const query: URLSearchParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<AmountType | undefined>(
    undefined
  );
  const [orderController, setOrderController] =
    useState<AbortController | null>(new AbortController());
  const [openDialog, setOpenDialog] = useState(false);
  const oAuthReady = config?.oauthProviders.length;
  const providers = config?.oauthProviders || [];
  const GUESTORDER_KEY = 'guestOrder';
  const onOAuthSignIn = useCallback((provider: string) => {
    window.location.href = apiClient.getOAuthEndpoint(provider);
  }, []);

  const clearUrlState = useCallback(() => {
    const baseUrl = new URL(
      `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    );
    console.log('Clearing URL state, new URL:', baseUrl.toString());
    // Remove query parameters by replacing the URL without them
    // NOTE: we replace the URL to avoid back navigation to the guest order state!!
    window.history.replaceState(null, '', `${baseUrl}`);
  }, []);

  const clearStorageState = useCallback((state: string) => {
    localStorage.removeItem(state);
  }, []);

  const clearAllStoredState = useCallback((state: string = GUESTORDER_KEY) => {
    clearUrlState();
    clearStorageState(state);
  }, []);

  const createStorageState = useCallback((key: string, value: string) => {
    localStorage.setItem(key, value);
  }, []);
  const createGuestOrderUrlState = useCallback((amount: AmountType): string => {
    const baseUrl = new URL(
      `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    );
    const searchParams = new URLSearchParams();
    const guestData: GuestOrderRequest = {
      amount,
      createdAt: Date.now()
    };
    for (const [key, value] of Object.entries(guestData)) {
      searchParams.append(key, value.toString());
    }
    baseUrl.search = searchParams.toString();
    // window.location.replace(baseUrl.toString());
    // replace history whithout reloading the page with the guest order params
    window.history.replaceState(null, '', `${baseUrl}`);
    return JSON.stringify(guestData);
  }, []);

  // because this is also in useEffect, we memoize it to avoid recreating the function on each render
  // this will run twice on mount in dev mode but only once in production
  const handleCreateOrder = useCallback(
    async (amount: AmountType = 500) => {
      if (error) {
        setError(null);
        return;
      }
      setLoading(true);
      if (!user) {
        // toast.error('You must be logged in to create an order');
        toast.warning('We need you to log in first.');
        // save the amount the user wanted to pay in the URL so we can use it after login
        createStorageState(GUESTORDER_KEY, createGuestOrderUrlState(amount));
        setTimeout(() => {
          onOAuthSignIn(providers[0]);
        }, 2000);
        return;
      }
      // use try because the apiClient throws an error if the response is not ok!!!
      try {
        // there is a new tick after await completes
        const response = await apiClient.post(
          '/order',
          {
            amount_cents: amount
          },
          orderController?.signal
        ); // 5 euros in cents!!
        const data = await response.json();
        // NOTE:  we don't need to check if orderCode is present in the response
        // because it is done in the backend (order.py) and it raises an Error Response if not
        const orderCode = data.orderCode;
        toast.success(`Redirecting to payment page`);

        // Redirect to Viva Payments Smart Checkout
        // NOTE: Use demo URL for testing, change to production URL when going live
        const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${orderCode}`;
        // TODO: For production: const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${data.orderCode}`;

        // Redirect after a short delay to show the success message
        // NOTE: we can use replace() instead of assign or href, to prevent back navigation and duplicate orders
        // we can use assign() if we want to allow back navigation
        setTimeout(() => {
          window.location.assign(checkoutUrl);
        }, 1000);

        // for UI purposes until redirect happens
        setOrderCode(orderCode);
      } catch (error: any) {
        // The apiClient throws an error if the response is not ok (it is an HTTP error response)!!!
        // it also shows a toast with the error message
        // so no need to show another toast here
        setError(error.message);
        console.error('Error creating order:', error);
      } finally {
        // update state
        clearAllStoredState();
        setLoading(false);
      }
    },
    [
      user,
      error,
      createGuestOrderUrlState,
      createStorageState,
      onOAuthSignIn,
      providers
    ]
  );

  function handleClose() {
    setOpenDialog(false);
  }

  function handleConfirm() {
    setOpenDialog(false);
    handleCreateOrder(orderAmount);
  }

  // Effect 3: Handle successful login redirect for guest orders
  useEffect(() => {
    setOrderController(new AbortController());
    const queryResult = SearchParamsSchema.safeParse(Object.fromEntries(query));
    if (!queryResult.success) {
      clearAllStoredState();
      return;
    }
    const { amount, createdAt } = queryResult.data;
    if (!amount || !createdAt) return;
    // check if the guest order is valid and fresh
    const guestOrderResult = GuestOrderRequestSchema.safeParse({
      amount: amount,
      createdAt: createdAt
    });
    // if the guest order is fresh and valid, create the order
    if (guestOrderResult.success) {
      handleCreateOrder(guestOrderResult.data.amount);
    }
    // if it is a stale order, check localStorage for confirmation that it still exists
    else {
      const staleGuestOrderResult = StaleGuestOrderRequestSchema.safeParse({
        amount: amount,
        createdAt: createdAt
      });
      if (staleGuestOrderResult.success) {
        // if there is state in the localStorage, check if we need to confirm the order creation
        const { amount: storedAmount, createdAt: storedTime } = JSON.parse(
          localStorage.getItem(GUESTORDER_KEY) || '{}'
        );
        if (storedTime && storedAmount) {
          if (storedAmount == amount && storedTime == createdAt) {
            // request confirmation for the order
            setOrderAmount(staleGuestOrderResult.data.amount);
            setOpenDialog(true);
          }
        }
      }
    }
    // In any case clear state in localStorage in the setup function!
    clearAllStoredState(GUESTORDER_KEY);
    // cleanup function to abort fetch on unmount or state change
    return () => {
      orderController?.abort();
    };
  }, [query, handleCreateOrder, clearStorageState]); // Runs when user or query changes

  // Effect 2: Handle payment callbacks and failure states
  // should run once on mount, and whenever query or user changes
  // useEffect(() => {
  //   const paymentResultController = new AbortController();
  //   const result = SearchParamsSchema.safeParse(Object.fromEntries(query));
  //   if (!result.success) return;

  //   const { t, s, eventId, eci, orderFailed } = result.data;

  //   if (orderFailed) {
  //     console.log('Payment failed or was cancelled.');
  //     toast.error('Payment failed or was cancelled.');
  //     return;
  //   }
  //   const isPaymentCallback = t && s && eventId && eci ? true : false;
  //   if (!orderFailed && isPaymentCallback) {
  //     console.log('Transaction ID:', t);
  //     console.log('Order Code:', s);
  //     console.log('Event ID:', eventId);
  //     console.log('ECI:', eci);

  //     // we check the database only for logged in users to match their transactions
  //     if (!user) {
  //       toast.warning(
  //         'We need you to log in first to process the payment result.'
  //       );
  //       setTimeout(() => {
  //         onOAuthSignIn(providers[0]);
  //       }, 2000);
  //       return;
  //     }
  //     // TODO: add fallback if the webhook has not yet processed the transaction
  //     (async () => {
  //       // NOTE: we use try because the apiClient throws an error if the response is not ok!!!
  //       try {
  //         // this is an internal request to our database
  //         const response = await apiClient.get(
  //           `/transaction?transaction_id=${t}&order_code=${s}`
  //         );
  //         const transaction: UserPaymentInfo = await response.json();
  //         console.log('Transaction details:', transaction);
  //         if (
  //           //NOTE: check if the transaction is empty and doesn't match the query params
  //           !transaction.transaction_id ||
  //           !transaction.order_code
  //         ) {
  //           toast.error('Checking if Webhook was not received');
  //           const payment_payload: Partial<UserPaymentInfo> = {
  //             user_id: user.id,
  //             transaction_id: t as string,
  //             order_code: s as string,
  //             event_id: Number(eventId),
  //             eci: Number(eci)
  //           };
  //           // this is an external request to get the transaction from Viva Payments
  //           const transaction_fallback = await apiClient.post(
  //             `/payment`,
  //             payment_payload,
  //             paymentResultController.signal
  //           );
  //           const payment_res: UserPaymentInfo =
  //             await transaction_fallback.json();
  //           if (!payment_res.transaction_id || !payment_res.order_code) {
  //             toast.error('Payment processing failed in Fallback!');
  //             return;
  //           }
  //         }
  //         toast.success('Payment processed successfully!');

  //         // go back to home after 1 second
  //         setTimeout(() => {
  //           window.location.replace('/');
  //         }, 1000);
  //       } catch (error) {
  //         // the apiClient throws an error if the response is not ok!!!
  //         // it also shows a toast with the error message
  //         // so no need to show another toast here
  //         console.error('Error processing payment:', error);
  //       } finally {
  //         // clear URL state
  //         clearAllStoredState();
  //       }
  //     })();
  //   }
  //   return () => {
  //     paymentResultController.abort();
  //   };
  // }, [query, user]); // Runs when query or user changes

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
      <ConfirmDialog
        open={openDialog}
        handleClose={handleClose}
        handleConfirm={handleConfirm}
      />
    </div>
  );
}
