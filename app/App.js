import { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Linking, BackHandler, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { PAGES } from './games';
import { SITE_URL } from './config';

// Each game is packed inside the app. It runs as if it lived at SITE_URL/<page>/,
// so saved progress works and the leaderboard posts to your Netlify site.
const BASE = { home: '/', privacy: '/privacy/' };

function pageFor(url) {
  if (!url || !url.startsWith(SITE_URL)) return null;
  const p = url.slice(SITE_URL.length).split('#')[0].split('?')[0];
  if (p === '' || p === '/' || p === '/index.html') return 'home';
  if (p === '/privacy' || p.startsWith('/privacy/')) return 'privacy';
  if (p === '/adventure' || p.startsWith('/adventure/')) return 'home';
  return undefined; // another page on the site (e.g. feedback): load it from the web
}

export default function App() {
  const [page, setPage] = useState('home');
  const [hash, setHash] = useState('');
  const web = useRef(null);

  const go = useCallback((url) => {
    const p = pageFor(url);
    if (p) { setHash(url.includes('#') ? url.slice(url.indexOf('#')) : ''); setPage(p); return false; }
    if (p === undefined) return true;             // other pages on your site
    if (/^https?:/.test(url)) { Linking.openURL(url); return false; } // outside links open in Safari
    return true;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (page !== 'home') { setPage('home'); return true; } return false; });
    return () => sub.remove();
  }, [page]);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        ref={web}
        key={page + hash}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: PAGES[page], baseUrl: SITE_URL + BASE[page] + hash }}
        onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('data:') || req.url === SITE_URL + BASE[page] + hash ? true : go(req.url)}
        onOpenWindow={(e) => go(e.nativeEvent.targetUrl)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={page === 'privacy'}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        textZoom={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf1dc' },
  web: { flex: 1, backgroundColor: '#fdf1dc' },
});
