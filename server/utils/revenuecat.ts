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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetches this user's non-subscription (consumable) purchases for a product straight from
// RevenueCat, and returns whichever of them aren't in `alreadyCreditedIds` yet.
//
// Deliberately does NOT try to match the client's own transactionIdentifier (the StoreKit
// transaction id, e.g. "2000001233966966") against anything here -- RevenueCat's REST API
// identifies each purchase with its own internal id (e.g. "o1_niqWGwDDMk5AXjtAxOBPHg"), in a
// completely different format, so that comparison can never succeed. The RevenueCat id is the
// only id this function (and the iap_transactions table) ever deals in; the client's id is only
// used to trigger a fresh lookup, never to identify the purchase itself.
//
// Retries a few times with a short delay in case a brand-new purchase hasn't propagated to this
// endpoint yet (it can lag a moment behind the client's purchaseStoreProduct call resolving).
export async function findUncreditedRevenueCatPurchases(
  appUserId: string,
  productId: string,
  alreadyCreditedIds: Set<string>
): Promise<RevenueCatNonSubscription[]> {
  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  }

  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt++) {
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
      throw new Error(`RevenueCat lookup failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as RevenueCatSubscriber;
    const transactions = data.subscriber?.non_subscriptions?.[productId] ?? [];
    const uncredited = transactions.filter((t) => !alreadyCreditedIds.has(t.id));

    console.log(
      `[revenuecat] lookup attempt ${attempt}/${attempts} appUserId=${appUserId} productId=${productId} totalKnown=${transactions.length} uncredited=${uncredited.length}`
    );

    if (uncredited.length > 0) return uncredited;
    if (attempt < attempts) await sleep(2000);
  }

  return [];
}
