import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CheckoutForm({ onSuccess, onCancel }: CheckoutFormProps) {
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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/shop?payment=success',
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Your purchase has been processed!",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
}