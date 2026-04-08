import { useState } from 'react';
import api from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  onSuccess: (response: any) => void;
  onError?: (error: any) => void;
}

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);

  const loadScript = (src: string) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async ({
    amount,
    currency = 'INR',
    name = 'NexusBill SaaS',
    description = 'Standard Plan Subscription',
    onSuccess,
    onError
  }: PaymentOptions) => {
    setLoading(true);
    try {
      // 1. Load Razorpay SDK
      const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      // 2. Create Order on Backend
      const { data } = await api.post('/payments/razorpay/order', {
        amount,
        currency,
        receipt: `receipt_${Date.now()}`
      });

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      // 3. Configure Razorpay Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Test Key from .env
        amount: data.amount,
        currency: data.currency,
        name,
        description,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            // 4. Verify Payment on Backend
            const verifyRes = await api.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              onSuccess(verifyRes.data);
            } else {
              if (onError) onError(verifyRes.data);
            }
          } catch (err: any) {
            console.error('Verification Error:', err);
            if (onError) onError(err);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#4f46e5' // Indigo 600
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        if (onError) onError(response.error);
      });
      rzp.open();

    } catch (err: any) {
      console.error('Payment Flow Error:', err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return { handlePayment, loading };
};
