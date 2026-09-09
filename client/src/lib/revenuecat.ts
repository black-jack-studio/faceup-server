import { Purchases, PRODUCT_CATEGORY } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";

// RevenueCat public (app-specific) API keys -- safe to ship in the client, they only allow
// making purchases and reading offerings, never spending/refunding.
// TODO: add the "android" key once the Play Store app is set up in RevenueCat.
const REVENUECAT_PUBLIC_API_KEY: Record<string, string> = {
  ios: "appl_XzHPlSAZWveQsgwuYcypWTeGthr",
};

let configured = false;

// Configures the SDK once per app session and identifies the signed-in user to RevenueCat
// (appUserID = our own user id), so the server can later look up that same id via the
// RevenueCat REST API to verify a purchase before crediting currency. Safe to call again on
// every user change -- it just logs the new id in once already configured.
export async function initPurchases(userId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const apiKey = REVENUECAT_PUBLIC_API_KEY[platform];
  if (!apiKey) return;

  if (!configured) {
    await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    configured = true;
  } else if (userId) {
    await Purchases.logIn({ appUserID: userId });
  }
}

export class PurchaseCancelledError extends Error {}

// Buys a single consumable (coins/gems pack) by its RevenueCat product identifier (e.g.
// "coins_5k") and resolves once the store transaction completes. Only returns the identifiers
// needed to confirm the purchase server-side -- crediting the currency happens there, never
// from this result directly, since the client can't be trusted with real money.
export async function purchaseConsumable(
  productId: string
): Promise<{ productIdentifier: string; transactionIdentifier: string }> {
  const { products } = await Purchases.getProducts({
    productIdentifiers: [productId],
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });

  const product = products[0];
  if (!product) {
    throw new Error(`Product ${productId} not found in the store`);
  }

  try {
    const { transaction } = await Purchases.purchaseStoreProduct({ product });
    return {
      productIdentifier: transaction.productIdentifier,
      transactionIdentifier: transaction.transactionIdentifier,
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      throw new PurchaseCancelledError("Purchase cancelled");
    }
    throw error;
  }
}
