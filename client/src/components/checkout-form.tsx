import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Coin, Gem } from '@/icons';

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount?: number;
  pack?: any;
}

export default function CheckoutForm({ onSuccess, onCancel, amount, pack }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/shop?payment=success',
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded without redirect
      onSuccess();
    } else {
      // Payment requires redirect (3D Secure, etc.)
      // User will be redirected and handled by the shop page
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-ink/30 p-6 rounded-2xl border border-white/10">
          <div className="max-w-sm mx-auto">
            <PaymentElement 
              options={{
                layout: {
                  type: 'accordion',
                  defaultCollapsed: false,
                  radios: false,
                  spacedAccordionItems: true
                },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'never',
                    address: {
                      country: 'never',
                      line1: 'never',
                      line2: 'never',
                      city: 'never',
                      state: 'never',
                      postalCode: 'never'
                    }
                  }
                },
                wallets: {
                  applePay: 'never',
                  googlePay: 'never'
                }
              }}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="max-w-sm mx-auto space-y-3">
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full bg-accent-green hover:bg-accent-green/90 text-ink font-bold py-3 text-lg rounded-xl"
            data-testid="button-pay-now"
          >
            {isProcessing ? 'Processing...' : `Pay ${amount || '0'}€`}
          </Button>
          
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl"
            disabled={isProcessing}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}