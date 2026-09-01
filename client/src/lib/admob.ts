import { AdMob, RewardAdPluginEvents } from "@capacitor-community/admob";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { getTrackingAuthorizationStatus } from "@/lib/tracking-authorization";

// Real FaceUp AdMob rewarded ad units. `isTesting: true` below (see showRewardedAd) makes the
// SDK automatically serve Google's sample test ads instead of these on non-registered devices,
// so it's safe to ship these real IDs before the app is store-approved.
const REWARDED_AD_UNIT_ID: Record<string, string> = {
  ios: "ca-app-pub-2568391662663564/4460833189",
  android: "ca-app-pub-2568391662663564/9202662003",
};

let initPromise: Promise<void> | null = null;

// Initializes the AdMob SDK once per app session, requesting the iOS App Tracking
// Transparency permission first (required before any ad request that may use IDFA).
export function initAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = (async () => {
      // Shared with analytics.ts — see tracking-authorization.ts for why this must stay a
      // single memoized request rather than each caller prompting independently.
      await getTrackingAuthorizationStatus();

      await AdMob.initialize({
        // TODO: set to false once this app ships with its own production ad unit IDs.
        initializeForTesting: true,
      });
    })();
  }

  return initPromise;
}

// Shows a rewarded video ad and resolves true only if the user watched it through to the
// reward. Resolves false if the ad fails to load/show or is dismissed before earning the reward.
export async function showRewardedAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // No native ad surface in the web preview — treat as watched so the flow stays testable.
    return true;
  }

  await initAdMob();

  const platform = Capacitor.getPlatform();
  const adId = REWARDED_AD_UNIT_ID[platform] ?? REWARDED_AD_UNIT_ID.android;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    // Rewarded fires as soon as the reward threshold is reached *while the ad is still
    // playing* — well before the user actually closes it. Only Dismissed means the ad
    // surface is actually gone, so that's the only event allowed to resolve the promise;
    // Rewarded just records whether a reward was earned by the time that happens.
    let earnedReward = false;
    let rewardedHandle: Promise<PluginListenerHandle> | undefined;
    let dismissedHandle: Promise<PluginListenerHandle> | undefined;
    let failedHandle: Promise<PluginListenerHandle> | undefined;

    const cleanup = async () => {
      (await rewardedHandle)?.remove?.();
      (await dismissedHandle)?.remove?.();
      (await failedHandle)?.remove?.();
    };

    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      void cleanup();
      resolve(result);
    };

    rewardedHandle = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earnedReward = true; });
    dismissedHandle = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => settle(earnedReward));
    failedHandle = AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => settle(false));

    AdMob.prepareRewardVideoAd({ adId, isTesting: true }) // TODO: remove isTesting for production
      .then(() => AdMob.showRewardVideoAd())
      .catch(() => settle(false));
  });
}
