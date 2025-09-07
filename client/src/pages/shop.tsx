import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import CheckoutForm from '@/components/checkout-form';
import PayPalButton from '@/components/paypal-button';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Shop() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');

  const handlePurchase = async (pack: any, packType: 'coins' | 'gems', method: 'stripe' | 'paypal' = 'stripe') => {
    try {
      setPaymentMethod(method);
      setSelectedPack({ ...pack, packType });
      
      if (method === 'stripe') {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: pack.price,
            packType,
            packId: pack.id,
          }),
        });

        const data = await response.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setShowCheckout(true);
        }
      } else {
        setShowCheckout(true);
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setClientSecret("");
    setSelectedPack(null);
    // Refresh user data to show updated balance
    window.location.reload();
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
    setClientSecret("");
    setSelectedPack(null);
    setPaymentMethod('stripe');
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    // Could show a toast notification here
  };

  const coinPacks = [
    { id: 1, coins: 1000, price: 4.99, popular: false },
    { id: 2, coins: 2500, price: 9.99, popular: true },
    { id: 3, coins: 5000, price: 19.99, popular: false },
    { id: 4, coins: 12000, price: 39.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 100, price: 2.99, popular: false },
    { id: 2, gems: 250, price: 6.99, popular: true },
    { id: 3, gems: 500, price: 12.99, popular: false },
    { id: 4, gems: 1200, price: 24.99, popular: false },
  ];

  const cardBacks = [
    { id: 1, name: "Royal Blue", price: 150, currency: "gems", owned: false },
    { id: 2, name: "Golden Crown", price: 200, currency: "gems", owned: false },
    { id: 3, name: "Midnight Black", price: 100, currency: "gems", owned: true },
    { id: 4, name: "Ruby Red", price: 300, currency: "gems", owned: false },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mr-3 text-white hover:bg-muted"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Shop</h1>
        </div>

        {/* Balance Display */}
        <motion.div
          className="flex justify-center space-x-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-coins text-yellow-400 text-lg" />
            <span className="text-yellow-400 font-semibold" data-testid="shop-coins">
              {user?.coins?.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-gem text-purple-400 text-lg" />
            <span className="text-purple-400 font-semibold" data-testid="shop-gems">
              {user?.gems?.toLocaleString() || "0"}
            </span>
          </div>
        </motion.div>

        {/* Coin Packs */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-coins text-yellow-400 mr-2" />
            Coin Packs
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {coinPacks.map((pack, index) => (
              <Card 
                key={pack.id} 
                className={`bg-card border-border relative ${pack.popular ? 'border-primary' : ''}`}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {pack.coins.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">coins</div>
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
                      data-testid={`button-buy-coins-stripe-${pack.id}`}
                      onClick={() => handlePurchase(pack, 'coins', 'stripe')}
                    >
                      ${pack.price} - Carte
                    </Button>
                    <Button
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs"
                      data-testid={`button-buy-coins-paypal-${pack.id}`}
                      onClick={() => handlePurchase(pack, 'coins', 'paypal')}
                    >
                      ${pack.price} - PayPal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Gem Packs */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-gem text-purple-400 mr-2" />
            Gem Packs
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {gemPacks.map((pack, index) => (
              <Card 
                key={pack.id} 
                className={`bg-card border-border relative ${pack.popular ? 'border-primary' : ''}`}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {pack.gems.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">gems</div>
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs"
                      data-testid={`button-buy-gems-stripe-${pack.id}`}
                      onClick={() => handlePurchase(pack, 'gems', 'stripe')}
                    >
                      ${pack.price} - Carte
                    </Button>
                    <Button
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs"
                      data-testid={`button-buy-gems-paypal-${pack.id}`}
                      onClick={() => handlePurchase(pack, 'gems', 'paypal')}
                    >
                      ${pack.price} - PayPal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Card Backs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-id-card text-blue-400 mr-2" />
            Card Backs
          </h2>
          <div className="space-y-3">
            {cardBacks.map((cardBack, index) => (
              <Card key={cardBack.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{cardBack.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        Premium card design
                      </p>
                    </div>
                    <div className="text-right">
                      {cardBack.owned ? (
                        <span className="text-green-400 text-sm font-medium">Owned</span>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/80 text-white"
                          data-testid={`button-buy-cardback-${cardBack.id}`}
                        >
                          {cardBack.price}{" "}
                          <i className={`fas fa-${cardBack.currency === "gems" ? "gem" : "coins"} ml-1`} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Coming Soon */}
        <motion.div
          className="mt-8 p-4 bg-muted/20 border border-muted rounded-lg text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ShoppingCart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            More items coming soon!
          </p>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {showCheckout && selectedPack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Finaliser l'achat
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePaymentCancel}
                className="text-white hover:bg-muted"
              >
                ✕
              </Button>
            </div>
            <p className="text-muted-foreground mb-6">
              {selectedPack?.packType === 'coins' 
                ? `${selectedPack?.coins?.toLocaleString()} coins pour $${selectedPack?.price}`
                : `${selectedPack?.gems?.toLocaleString()} gems pour $${selectedPack?.price}`
              }
            </p>
            
            {paymentMethod === 'stripe' && clientSecret ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-white font-medium mb-2">Paiement sécurisé</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Carte bancaire • Apple Pay • Google Pay
                  </p>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                  />
                </Elements>
              </div>
            ) : paymentMethod === 'paypal' ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-white font-medium mb-2">Paiement PayPal</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Payez avec votre compte PayPal
                  </p>
                </div>
                <div className="bg-muted/20 p-4 rounded-lg">
                  <PayPalButton
                    amount={selectedPack.price.toString()}
                    packType={selectedPack.packType}
                    packId={selectedPack.id}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    onError={handlePaymentError}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Chargement...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
