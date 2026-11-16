// JS side of the local Game Center module. Falls back to "not available" when the native
// module isn't built in (e.g. Expo Go), so the app never crashes because of it.
import { requireOptionalNativeModule } from 'expo';

const Native = requireOptionalNativeModule('GameCenter');

export const available = !!Native;
export const authenticate = async () => { try { return Native ? await Native.authenticate() : false; } catch { return false; } };
export const canChallenge = () => { try { return Native ? Native.canChallenge() : false; } catch { return false; } };
export const submitScore = async (score, id) => { try { return Native ? await Native.submitScore(Math.max(0, Math.floor(score)), id) : false; } catch { return false; } };
export const showLeaderboard = async (id) => { try { return Native ? await Native.showLeaderboard(id) : false; } catch { return false; } };
export const challenge = async (id) => { try { return Native ? await Native.challenge(id) : false; } catch { return false; } };
