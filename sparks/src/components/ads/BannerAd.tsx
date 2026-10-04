import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import Constants from "expo-constants";
import { getBannerAdUnitId } from "../../constants/ads";

const BANNER_MIN_HEIGHT = 50;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Only load on native when not in Expo Go (react-native-google-mobile-ads requires dev build)
let RNBannerAd: React.ComponentType<{
  unitId: string;
  size: string;
  width?: number;
  onAdLoaded?: (dimensions?: { width: number; height: number }) => void;
  onAdFailedToLoad?: (error: Error) => void;
  requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
}> | null = null;
let BannerAdSizeEnum: { ANCHORED_ADAPTIVE_BANNER: string } | null = null;

if (
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership !== "expo"
) {
  try {
    const ads = require("react-native-google-mobile-ads");
    RNBannerAd = ads.BannerAd;
    BannerAdSizeEnum = ads.BannerAdSize;
  } catch {
    RNBannerAd = null;
    BannerAdSizeEnum = null;
  }
}

export function BannerAd() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return null;
  }

  if (!RNBannerAd) {
    return null;
  }

  const unitId = getBannerAdUnitId(Platform.OS);
  const size = BannerAdSizeEnum?.ANCHORED_ADAPTIVE_BANNER ?? "ANCHORED_ADAPTIVE_BANNER";

  return (
    <View style={[styles.wrap, !loaded && !error && styles.placeholder]}>
      <RNBannerAd
        unitId={unitId}
        size={size}
        width={Math.round(SCREEN_WIDTH)}
        requestOptions={{
          requestNonPersonalizedAdsOnly: __DEV__,
        }}
        onAdLoaded={() => {
          setLoaded(true);
          setError(false);
        }}
        onAdFailedToLoad={() => {
          setError(true);
        }}
      />
      {__DEV__ && error && (
        <Text style={styles.placeholderText}>Ad failed to load</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    minHeight: BANNER_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    minHeight: BANNER_MIN_HEIGHT,
  },
  placeholderText: {
    fontSize: 12,
    color: "#888",
  },
});
