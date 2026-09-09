// Server-side source of truth for what each IAP consumable product credits. Mirrors the
// coinPacks/gemPacks amounts in client/src/pages/shop.tsx, but this copy is the one that
// actually decides what gets credited -- the client's displayed amount is never trusted.
export const IAP_PRODUCTS: Record<string, { currency: "coins" | "gems"; amount: number }> = {
  coins_1k: { currency: "coins", amount: 1000 },
  coins_5k: { currency: "coins", amount: 5000 },
  coins_20k: { currency: "coins", amount: 20000 },
  coins_40k: { currency: "coins", amount: 40000 },
  coins_120k: { currency: "coins", amount: 120000 },
  coins_300k: { currency: "coins", amount: 300000 },
  gems_50: { currency: "gems", amount: 50 },
  gems_250: { currency: "gems", amount: 250 },
  gems_1k: { currency: "gems", amount: 1000 },
  gems_2k: { currency: "gems", amount: 2000 },
  gems_6k: { currency: "gems", amount: 6000 },
  gems_15k: { currency: "gems", amount: 15000 },
};

interface RevenueCatNonSubscription {
  id: string; // the transaction id
  store: string;
  purchase_date: string;
}

interface RevenueCatSubscriber {
  subscriber: {
    non_subscriptions: Record<string, RevenueCatNonSubscription[]>;
  };
}

// Confirms a client-reported purchase actually happened by asking RevenueCat directly (which
// already validated the receipt with Apple/Google) rather than trusting the productId/
// transactionId the client sent. Returns true only if that exact transaction id shows up under
// that product in this user's RevenueCat subscriber record.
export async function verifyRevenueCatPurchase(
  appUserId: string,
  productId: string,
  transactionId: string
): Promise<boolean> {
  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`RevenueCat lookup failed: ${response.status}`);
  }

  const data = (await response.json()) as RevenueCatSubscriber;
  const transactions = data.subscriber?.non_subscriptions?.[productId] ?? [];
  return transactions.some((t) => t.id === transactionId);
}
