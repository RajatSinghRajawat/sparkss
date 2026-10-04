import { useCallback } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getInterstitialAdUnitId } from "../../constants/ads";

let InterstitialAdClass: typeof import("react-native-google-mobile-ads").InterstitialAd | null = null;
let AdEventType: typeof import("react-native-google-mobile-ads").AdEventType | null = null;

if (
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership !== "expo"
) {
  try {
    const ads = require("react-native-google-mobile-ads");
    InterstitialAdClass = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
  } catch {
    InterstitialAdClass = null;
  }
}

/**
 * Returns a function to show an interstitial ad (full-page at natural breaks).
 * Resolves when the ad is closed or on error. Call when appropriate (e.g. after quiz result, level complete).
 */
export function useInterstitialAd() {
  const showInterstitialAd = useCallback((): Promise<void> => {
    if (!InterstitialAdClass || !AdEventType) {
      return Promise.resolve();
    }
    // Held in a const so the narrowing survives into the Promise callback.
    const platform = Platform.OS;
    if (platform !== "android" && platform !== "ios") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve();
      };

      const unitId = getInterstitialAdUnitId(platform);
      const interstitial = InterstitialAdClass!.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: __DEV__,
      });

      interstitial.addAdEventListener(AdEventType!.CLOSED, finish);
      interstitial.addAdEventListener(AdEventType!.ERROR, finish);
      interstitial.addAdEventListener(AdEventType!.LOADED, () => {
        interstitial.show().catch(finish);
      });

      const t = setTimeout(finish, 90000);
      interstitial.load();
    });
  }, []);

  return {
    showInterstitialAd,
    isAvailable:
      !!InterstitialAdClass && (Platform.OS === "android" || Platform.OS === "ios"),
  };
}
