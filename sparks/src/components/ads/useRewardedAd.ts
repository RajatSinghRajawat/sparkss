import { useCallback } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getRewardedAdUnitId } from "../../constants/ads";

let RewardedAdClass: typeof import("react-native-google-mobile-ads").RewardedAd | null = null;
let AdEventType: typeof import("react-native-google-mobile-ads").AdEventType | null = null;
let RewardedAdEventType: typeof import("react-native-google-mobile-ads").RewardedAdEventType | null = null;

if (
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership !== "expo"
) {
  try {
    const ads = require("react-native-google-mobile-ads");
    RewardedAdClass = ads.RewardedAd;
    AdEventType = ads.AdEventType;
    RewardedAdEventType = ads.RewardedAdEventType;
  } catch {
    RewardedAdClass = null;
  }
}

const AD_LOAD_TIMEOUT_MS = 15000;
let inFlight: Promise<boolean> | null = null;

/**
 * Returns a function to show a rewarded ad.
 * Resolves true when the reward was earned or no ad could be shown; false only
 * when the user closed a loaded ad before earning the reward.
 */
export function useRewardedAd() {
  const showRewardedAd = useCallback((): Promise<boolean> => {
    if (!RewardedAdClass || !AdEventType || !RewardedAdEventType) {
      return Promise.resolve(true);
    }
    // Held in a const so the narrowing survives into the Promise callback.
    const platform = Platform.OS;
    if (platform !== "android" && platform !== "ios") {
      return Promise.resolve(true);
    }

    // One ad at a time: repeated taps while one is loading used to stack ads.
    if (inFlight) return inFlight;

    inFlight = new Promise<boolean>((resolve) => {
      let settled = false;
      const unsubscribers: (() => void)[] = [];
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimer);
        unsubscribers.forEach((off) => off());
        inFlight = null;
        resolve(value);
      };

      const unitId = getRewardedAdUnitId(platform);
      const rewarded = RewardedAdClass!.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: __DEV__,
      });

      unsubscribers.push(
        rewarded.addAdEventListener(RewardedAdEventType!.EARNED_REWARD, () => finish(true)),
        // Closing a loaded ad before the reward is the only "no".
        rewarded.addAdEventListener(AdEventType!.CLOSED, () => finish(false)),
        // No fill / offline / blocked is routine — don't lock the student out
        // of enrolling because an ad couldn't load.
        rewarded.addAdEventListener(AdEventType!.ERROR, () => finish(true)),
        rewarded.addAdEventListener(RewardedAdEventType!.LOADED, () => {
          // Loaded after we already gave up: don't pop an ad over another screen.
          if (settled) return;
          clearTimeout(loadTimer);
          rewarded.show().catch(() => finish(true));
        })
      );

      // Same fail-open if the ad never loads.
      const loadTimer = setTimeout(() => finish(true), AD_LOAD_TIMEOUT_MS);
      rewarded.load();
    });
    return inFlight;
  }, []);

  return {
    showRewardedAd,
    isAvailable:
      !!RewardedAdClass && (Platform.OS === "android" || Platform.OS === "ios"),
  };
}
