/**
 * Safe conditional loader for react-native-google-mobile-ads.
 * Falls back gracefully in Expo Go (where native module is not linked).
 * In a production native build (APK/AAB), this always resolves.
 *
 * IMPORTANT: Replace the production ad unit IDs below with your real
 * AdMob IDs from https://admob.google.com before publishing.
 */

import { Platform } from 'react-native';

type AdsModule = typeof import('react-native-google-mobile-ads');

let _ads: AdsModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _ads = require('react-native-google-mobile-ads') as AdsModule;
} catch {
  // Native module not available (e.g. Expo Go). Ads will be silently skipped.
}

export const adsAvailable = _ads !== null && Platform.OS !== 'web';
export const ads = _ads;

/** Call once at app startup to initialize the AdMob SDK. */
export function initializeMobileAds(): void {
  if (!adsAvailable || !_ads) return;
  try {
    _ads.default().initialize().catch(() => {});
  } catch {
    // Non-critical
  }
}

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────
// Test IDs (Google official) are used in __DEV__. Replace the strings below
// with your real AdMob ad unit IDs when building for production.

const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';

const PROD_BANNER_ANDROID = 'ca-app-pub-2739107649230416/9442875781';
const PROD_BANNER_IOS = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // TODO: add iOS banner unit ID
const PROD_INTERSTITIAL_ANDROID = 'ca-app-pub-2739107649230416/3708772769';
const PROD_INTERSTITIAL_IOS = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // TODO: add iOS rewarded interstitial unit ID

export const BANNER_AD_UNIT_ID =
  Platform.OS === 'ios'
    ? (__DEV__ ? TEST_BANNER_IOS : PROD_BANNER_IOS)
    : (__DEV__ ? TEST_BANNER_ANDROID : PROD_BANNER_ANDROID);

export const INTERSTITIAL_AD_UNIT_ID =
  Platform.OS === 'ios'
    ? (__DEV__ ? TEST_INTERSTITIAL_IOS : PROD_INTERSTITIAL_IOS)
    : (__DEV__ ? TEST_INTERSTITIAL_ANDROID : PROD_INTERSTITIAL_ANDROID);
