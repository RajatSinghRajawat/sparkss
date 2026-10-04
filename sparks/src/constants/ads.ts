/**
 * AdMob unit IDs for Sparks (student) app.
 * In __DEV__ use getBannerId/getRewardedId with platform so test IDs are used (ads always fill).
 */

const PROD_BANNER = "ca-app-pub-4556171176270367/9370777185";
const PROD_REWARDED = "ca-app-pub-4556171176270367/3196251075";
const PROD_INTERSTITIAL = "ca-app-pub-4556171176270367/9934544077";
// Google's official test ad units (always fill in dev)
const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_REWARDED_ANDROID = "ca-app-pub-3940256099942544/5224354917";
const TEST_REWARDED_IOS = "ca-app-pub-3940256099942544/1712485313";
const TEST_INTERSTITIAL_ANDROID = "ca-app-pub-3940256099942544/1033173712";
const TEST_INTERSTITIAL_IOS = "ca-app-pub-3940256099942544/4411468910";

export function getBannerAdUnitId(platform: "android" | "ios"): string {
  if (!__DEV__) return PROD_BANNER;
  return platform === "ios" ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
}

export function getRewardedAdUnitId(platform: "android" | "ios"): string {
  if (!__DEV__) return PROD_REWARDED;
  return platform === "ios" ? TEST_REWARDED_IOS : TEST_REWARDED_ANDROID;
}

export function getInterstitialAdUnitId(platform: "android" | "ios"): string {
  if (!__DEV__) return PROD_INTERSTITIAL;
  return platform === "ios" ? TEST_INTERSTITIAL_IOS : TEST_INTERSTITIAL_ANDROID;
}

/** @deprecated Use getBannerAdUnitId(Platform.OS) in __DEV__ for test ads */
export const AD_UNIT_IDS = {
  BANNER: PROD_BANNER,
  REWARDED: PROD_REWARDED,
} as const;
