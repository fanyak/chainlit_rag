import { apiClient } from 'api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// import Page from 'pages/Page';
import { useAuth } from '@chainlit/react-client';

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
  const { user } = useAuth();
  const query = useQuery();
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  useEffect(() => {
    let t: string | null = null;
    let s: string | null = null;
    let eventId: string | null = null;
    let eci: string | null = null;
    let failure: string | null = null;
    // Capture URL parameters on mount
    try {
      t = query.get('t');
      s = query.get('s');
      //const lang = query.get('lang');
      eventId = query.get('eventId');
      eci = query.get('eci');
      failure = query.get('failure');
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    }
    if (failure && String(failure) === '1') {
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
  }, [useQuery]); // so this runs once on mount and if queryParameters change

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('You must be logged in to create an order');
      return;
    }
    setLoading(true);
    // use try because the apiClient throws an error if the response is not ok!!!
    try {
      const response = await apiClient.post('/order', { amount_cents: 1000 }); // 10 euros in cents
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
      console.error('Error creating order:', error);
    } finally {
      // update state
      setLoading(false);
    }
  };

  return (
    //<Page>
    <div className="custom-pg flex flex-col items-center justify-center h-full w-full p-8 space-y-6">
      <h1 className="text-3xl font-bold">Create Viva Payment Order</h1>

      {user ? (
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Logged in as:</p>
          <p className="font-semibold text-gray-600">{user.identifier}</p>
        </div>
      ) : (
        <p className="text-red-500">Please log in to create an order</p>
      )}

      <button
        onClick={handleCreateOrder}
        disabled={loading || !user}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating Order...' : 'Create Order'}
      </button>

      {orderCode && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg space-y-2">
          <p className="text-green-800 font-semibold">Order Created!</p>
          <p className="text-sm text-gray-700">Order Code:</p>
          <code className="block bg-white p-2 rounded border text-sm text-gray-900">
            {orderCode}
          </code>
        </div>
      )}
    </div>
    // </Page>
  );
}
