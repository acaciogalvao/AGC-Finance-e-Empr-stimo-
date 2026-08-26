import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  BackHandler,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { INLINE_HTML, INLINE_JS } from './src/htmlBundle';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Manipula mensagens enviadas pela WebView (Solicitação de Permissões Android)
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (!data || !data.type) return;

      if (Platform.OS === 'android') {
        switch (data.type) {
          case 'OPEN_ACCESSIBILITY_SETTINGS':
            try {
              await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
            } catch (err) {
              await Linking.openSettings();
            }
            break;
          case 'OPEN_OVERLAY_SETTINGS':
            try {
              await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION', [
                { key: 'package', value: 'package:com.acaciogalvao.agcfinance' },
              ]);
            } catch (err) {
              await Linking.openSettings();
            }
            break;
          case 'OPEN_BATTERY_SETTINGS':
            try {
              await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
            } catch (err) {
              await Linking.openSettings();
            }
            break;
          case 'OPEN_APP_SETTINGS':
            await Linking.openSettings();
            break;
          default:
            break;
        }
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      console.warn('Erro ao processar mensagem da WebView:', err);
    }
  };

  // Suporte ao botão físico 'Voltar' do Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack]);

  // Script para suporte e comunicação WebView <-> React Native
  const jsToExecute = `
    (function() {
      try {
        window.__MOBILE_APP__ = true;
        window.__sendToNative = function(msg) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
          }
        };
      } catch (e) {
        console.error('[AGC Finance Native Bridge Error]:', e);
      }
    })();
    true;
  `;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        
        <View style={styles.webViewWrapper}>
          <WebView
            ref={webViewRef}
            source={{ html: INLINE_HTML, baseUrl: 'https://localhost' }}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            mixedContentMode="always"
            cacheEnabled={true}
            scalesPageToFit={false}
            bounces={false}
            overScrollMode="never"
            textZoom={100}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            injectedJavaScript={jsToExecute}
            onMessage={handleMessage}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Carregando AGC Finance...</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webViewWrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
});
