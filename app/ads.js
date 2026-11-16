// Real AdMob ads for Pup Slope (iPhone app only).
// The game (inside the WebView) asks for an ad with postMessage({type:'ad', kind, npa});
// we show it and answer with window.__pupAdDone(true|false).
import mobileAds, { RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType, AdsConsent, TestIds } from 'react-native-google-mobile-ads';

// Development builds always use Google's test ads (never click your own real ads!)
const UNIT = {
  rewarded:     __DEV__ ? TestIds.REWARDED     : 'ca-app-pub-3731881236858467/4483836109',   // "Keep riding"
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3731881236858467/5140497561',   // "Between runs"
};

let npa = true;          // non-personalized until the player's choice arrives from the game
let ready = false;
const slots = {};

export async function initAds() {
  try { await AdsConsent.gatherConsent(); } catch (e) {}          // Google's consent form (EU/UK) when required
  try { await mobileAds().initialize(); ready = true; } catch (e) {}
  preload('rewarded'); preload('interstitial');
}
export function setPersonalized(allowed) { npa = !allowed; }

function create(kind) {
  const opts = { requestNonPersonalizedAdsOnly: npa };
  return kind === 'rewarded' ? RewardedAd.createForAdRequest(UNIT.rewarded, opts) : InterstitialAd.createForAdRequest(UNIT.interstitial, opts);
}
function preload(kind) {
  if (!ready) return;
  const ad = create(kind), slot = { ad, loaded: false, waiters: [] };
  slots[kind] = slot;
  const LOADED = kind === 'rewarded' ? RewardedAdEventType.LOADED : AdEventType.LOADED;
  ad.addAdEventListener(LOADED, () => { slot.loaded = true; slot.waiters.splice(0).forEach(f => f(true)); });
  ad.addAdEventListener(AdEventType.ERROR, () => { slot.failed = true; slot.waiters.splice(0).forEach(f => f(false)); });
  ad.load();
}
const waitLoaded = (slot, ms) => slot.loaded ? Promise.resolve(true) : slot.failed ? Promise.resolve(false)
  : new Promise(res => { slot.waiters.push(res); setTimeout(() => res(false), ms); });

// Shows an ad; resolves true if the player earned the reward (rewarded) / the ad finished (interstitial).
export async function showAd(kind) {
  if (!ready) return false;
  if (!slots[kind] || slots[kind].failed) preload(kind);
  const slot = slots[kind];
  if (!(await waitLoaded(slot, 10000))) { preload(kind); return false; }
  return new Promise(resolve => {
    let earned = false, finished = false;
    const finish = ok => { if (finished) return; finished = true; preload(kind); resolve(ok); };
    if (kind === 'rewarded') slot.ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
    slot.ad.addAdEventListener(AdEventType.CLOSED, () => finish(kind === 'rewarded' ? earned : true));
    slot.ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
    slot.ad.show().catch(() => finish(false));
  });
}
