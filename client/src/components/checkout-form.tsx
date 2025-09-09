import { useStripe, useElements, PaymentElement, ExpressCheckoutElement } from '@stripe/react-stripe-js';
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
    <div className="space-y-4">
      {/* Purchase Summary */}
      <div className="max-w-sm mx-auto">
        <div className="bg-white/5 p-4 rounded-2xl text-center">
          <div className="flex items-center justify-center space-x-3 mb-3">
            {pack?.packType === 'coins' ? (
              <Coin className="w-6 h-6 text-accent-gold" />
            ) : (
              <Gem className="w-6 h-6 text-accent-purple" />
            )}
            <div>
              <p className="text-white font-bold text-lg">
                {pack?.packType === 'coins' 
                  ? `${pack?.coins?.toLocaleString()} coins`
                  : `${pack?.gems?.toLocaleString()} gems`
                }
              </p>
              <p className="text-white/60 text-sm">
                Total: ${amount || '0'}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/60">
            Moyens de paiement: Cartes • Apple Pay • Google Pay
          </p>
        </div>
      </div>
      
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
                  applePay: 'auto',
                  googlePay: 'auto'
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
            className="w-full bg-accent-green hover:bg-accent-green/90 text-ink font-bold py-3 text-lg"
            data-testid="button-pay-now"
          >
            {isProcessing ? 'Traitement en cours...' : `Payer $${amount || '0'}`}
          </Button>
          
          {/* Apple Pay & Google Pay Express Checkout */}
          <div className="my-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-ink px-2 text-white/60">ou payer avec</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {/* Apple Pay Button */}
              <button
                type="button"
                className="w-full bg-black text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-800 transition-colors"
                onClick={async () => {
                  if (!stripe || !elements) return;
                  setIsProcessing(true);
                  
                  try {
                    const result = await stripe.confirmPayment({
                      elements,
                      confirmParams: {
                        return_url: window.location.origin + '/shop?payment=success',
                      },
                      redirect: "if_required"
                    });

                    if (result.error) {
                      toast({
                        title: "Échec du paiement",
                        description: result.error.message || "Une erreur est survenue",
                        variant: "destructive",
                      });
                      setIsProcessing(false);
                    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                      onSuccess();
                    }
                  } catch (error) {
                    toast({
                      title: "Échec du paiement", 
                      description: "Une erreur inattendue est survenue",
                      variant: "destructive",
                    });
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                <span className="text-lg">🍎</span>
                <span className="font-semibold">Apple Pay</span>
              </button>

              {/* Google Pay Button */}
              <button
                type="button"
                className="w-full bg-gray-700 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-600 transition-colors"
                onClick={async () => {
                  if (!stripe || !elements) return;
                  setIsProcessing(true);
                  
                  try {
                    const result = await stripe.confirmPayment({
                      elements,
                      confirmParams: {
                        return_url: window.location.origin + '/shop?payment=success',
                      },
                      redirect: "if_required"
                    });

                    if (result.error) {
                      toast({
                        title: "Échec du paiement",
                        description: result.error.message || "Une erreur est survenue",
                        variant: "destructive",
                      });
                      setIsProcessing(false);
                    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                      onSuccess();
                    }
                  } catch (error) {
                    toast({
                      title: "Échec du paiement",
                      description: "Une erreur inattendue est survenue", 
                      variant: "destructive",
                    });
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                <span className="text-lg">🟢</span>
                <span className="font-semibold">Google Pay</span>
              </button>
            </div>
          </div>
          
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