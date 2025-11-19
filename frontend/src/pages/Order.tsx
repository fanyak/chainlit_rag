import { apiClient } from 'api';
import { useState } from 'react';
import { toast } from 'sonner';

import Page from 'pages/Page';

import { useAuth } from '@chainlit/react-client';

import { useQuery } from 'hooks/query';

export default function Order() {
  const { user } = useAuth();
  const query = useQuery();
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  // Capture URL parameters on mount
  const t = query.get('t');
  const s = query.get('s');
  //const lang = query.get('lang');
  const eventId = query.get('eventId');
  const eci = query.get('eci');
  console.log('t:', t);
  if (t) {
    console.log('Transaction ID:', t);
    console.log('Order Code:', s);
    console.log('Event ID:', eventId);
    console.log('ECI:', eci);

    // Handle payment callback here
    // For example, verify the payment with your backend
    // or show a success/failure message based on the status
    const payment_info = {
      user_identifier: user?.identifier,
      transaction_id: t,
      order_code: s,
      event_id: eventId,
      eci: eci
    };
    (async () => {
      const payment = await apiClient.post('/payment', payment_info);
      const res = await payment.json();
      if (res.detail) {
        toast.error(res.detail);
      } else {
        toast.success('Payment processed successfully!');
      }
      console.log(res.id);
    })();
  }

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('You must be logged in to create an order');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/order', {});
      const data = await response.json();

      if (data.orderCode) {
        setOrderCode(data.orderCode);
        toast.success('Redirecting to payment page...');

        // Redirect to Viva Payments Smart Checkout
        // Use demo URL for testing, change to production URL when going live
        const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${data.orderCode}`;
        // For production: const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${data.orderCode}`;

        // Redirect after a short delay to show the success message
        // Using replace() instead of href to prevent back navigation and duplicate orders
        setTimeout(() => {
          window.location.replace(checkoutUrl);
        }, 1000);
      } else {
        toast.error('Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <div className="flex flex-col items-center justify-center h-full w-full p-8 space-y-6">
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
    </Page>
  );
}
