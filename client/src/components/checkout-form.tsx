import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount?: number;
}

export default function CheckoutForm({ onSuccess, onCancel, amount }: CheckoutFormProps) {
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
        title: "Échec du paiement",
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
    <div className="max-h-[70vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="min-h-[200px]">
          <PaymentElement 
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: true
              },
              fields: {
                billingDetails: {
                  name: 'auto',
                  email: 'auto',
                  phone: 'auto',
                  address: {
                    country: 'auto',
                    line1: 'auto',
                    line2: 'auto',
                    city: 'auto',
                    state: 'auto',
                    postalCode: 'auto'
                  }
                }
              }
            }}
          />
        </div>
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full bg-accent-green hover:bg-accent-green/90 text-ink font-bold py-3 text-lg"
            data-testid="button-pay-now"
          >
            {isProcessing ? 'Traitement en cours...' : `Payer $${amount || '0'}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full border-white/20 text-white hover:bg-white/10"
            disabled={isProcessing}
            data-testid="button-cancel-payment"
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}