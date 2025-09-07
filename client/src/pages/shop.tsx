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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [selectedPack, setSelectedPack] = useState<any>(null);

  const handleSelectPack = (pack: any, packType: 'coins' | 'gems') => {
    setSelectedPack({ ...pack, packType });
    setShowPaymentModal(true);
  };

  const handlePaymentMethod = async (method: 'stripe' | 'paypal') => {
    try {
      setShowPaymentModal(false);
      
      if (method === 'stripe') {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: selectedPack.price,
            packType: selectedPack.packType,
            packId: selectedPack.id,
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
  };

  const handleModalCancel = () => {
    setShowPaymentModal(false);
    setSelectedPack(null);
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
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-sm"
                    data-testid={`button-buy-coins-${pack.id}`}
                    onClick={() => handleSelectPack(pack, 'coins')}
                  >
                    Acheter ${pack.price}
                  </Button>
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
                  <Button
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm"
                    data-testid={`button-buy-gems-${pack.id}`}
                    onClick={() => handleSelectPack(pack, 'gems')}
                  >
                    Acheter ${pack.price}
                  </Button>
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Choisir le mode de paiement
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleModalCancel}
                className="text-white hover:bg-muted"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-6">
              <p className="text-muted-foreground text-sm mb-2">Votre achat :</p>
              <p className="text-white font-medium">
                {selectedPack?.packType === 'coins' 
                  ? `${selectedPack?.coins?.toLocaleString()} coins`
                  : `${selectedPack?.gems?.toLocaleString()} gems`
                } - ${selectedPack?.price}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-primary hover:bg-primary/80 text-white p-4 h-auto flex items-center justify-start space-x-3"
                onClick={() => handlePaymentMethod('stripe')}
                data-testid="payment-method-stripe"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-credit-card text-lg" />
                  <div className="text-left">
                    <div className="font-medium">Carte bancaire</div>
                    <div className="text-xs opacity-80">Apple Pay • Google Pay • Cartes</div>
                  </div>
                </div>
              </Button>
              
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto flex items-center justify-start space-x-3"
                onClick={() => handlePaymentMethod('paypal')}
                data-testid="payment-method-paypal"
              >
                <div className="flex items-center space-x-2">
                  <i className="fab fa-paypal text-lg" />
                  <div className="text-left">
                    <div className="font-medium">PayPal</div>
                    <div className="text-xs opacity-80">Compte PayPal ou carte via PayPal</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {showCheckout && selectedPack && clientSecret && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Paiement sécurisé
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
            
            <p className="text-muted-foreground mb-4">
              {selectedPack?.packType === 'coins' 
                ? `${selectedPack?.coins?.toLocaleString()} coins pour $${selectedPack?.price}`
                : `${selectedPack?.gems?.toLocaleString()} gems pour $${selectedPack?.price}`
              }
            </p>
            
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Accepté : Carte bancaire • Apple Pay • Google Pay
              </p>
            </div>
            
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* PayPal Payment Modal */}
      {showCheckout && selectedPack && !clientSecret && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Paiement PayPal
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
        </div>
      )}
    </div>
  );
}
