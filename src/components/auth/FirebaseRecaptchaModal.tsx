import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { firebaseConfig } from '../../config/firebase';
import { isTablet } from '../../utils/responsive';

interface FirebaseRecaptchaModalProps {
  visible: boolean;
  phoneNumber: string;
  onSuccess: (verificationId: string) => void;
  onError: (errorMessage: string) => void;
  onClose: () => void;
}

// Strict minimum allowed origins for Firebase Phone Authentication and Google reCAPTCHA
const ALLOWED_ORIGINS = [
  'https://*.firebaseapp.com',
  'https://firebaseapp.com',
  'https://*.googleapis.com',
  'https://googleapis.com',
  'https://*.gstatic.com',
  'https://gstatic.com',
  'https://*.google.com',
  'https://google.com',
  'https://*.recaptcha.net',
  'https://recaptcha.net',
  `https://${firebaseConfig.authDomain}`,
  'about:blank',
];

export function FirebaseRecaptchaModal({
  visible,
  phoneNumber,
  onSuccess,
  onError,
  onClose,
}: FirebaseRecaptchaModalProps) {
  const webViewRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [isWebViewReady, setIsWebViewReady] = useState(false);

  // Stable references for callbacks to avoid re-triggering effects
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onCloseRef.current = onClose;
  });

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    clearTimer();
    setIsChallengeActive(false);
    setIsWebViewReady(false);
    onCloseRef.current();
  }, [clearTimer]);

  useEffect(() => {
    if (visible) {
      setIsChallengeActive(false);
      setIsWebViewReady(false);

      // 25-second fallback timeout for edge network issues
      timeoutRef.current = setTimeout(() => {
        clearTimer();
        onErrorRef.current(
          'Security verification timed out. Please check your internet connection and tap continue to retry.'
        );
        onCloseRef.current();
      }, 25000);
    } else {
      clearTimer();
      setIsChallengeActive(false);
      setIsWebViewReady(false);
    }

    return () => {
      clearTimer();
    };
  }, [visible, clearTimer]);

  if (!visible) return null;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Security Verification</title>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
    #recaptcha-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 1px;
      min-height: 1px;
    }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script>
    const config = ${JSON.stringify(firebaseConfig)};
    firebase.initializeApp(config);

    // Watch for visual challenge iframe (e.g. image selection popup)
    const observer = new MutationObserver(function() {
      const iframes = document.querySelectorAll('iframe[src*="google.com/recaptcha/api2/bframe"]');
      if (iframes.length > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CHALLENGE_DISPLAYED' }));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    try {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: function(token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_RESOLVED' }));
        },
        'expired-callback': function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: 'Verification expired. Please tap Resend to try again.'
          }));
        },
        'error-callback': function(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: (error && error.message) || 'reCAPTCHA verification error'
          }));
        }
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));

      firebase.auth().signInWithPhoneNumber("${phoneNumber}", window.recaptchaVerifier)
        .then(function(confirmationResult) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SUCCESS',
            verificationId: confirmationResult.verificationId
          }));
        })
        .catch(function(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: error.message,
            code: error.code
          }));
        });
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERROR',
        message: e.message
      }));
    }
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setIsWebViewReady(true);
      } else if (data.type === 'CHALLENGE_DISPLAYED') {
        // Visual reCAPTCHA puzzle triggered by Google — present interactively
        setIsChallengeActive(true);
      } else if (data.type === 'TOKEN_RESOLVED') {
        // Solved invisibly or via challenge
      } else if (data.type === 'SUCCESS') {
        clearTimer();
        setIsChallengeActive(false);
        onSuccessRef.current(data.verificationId);
      } else if (data.type === 'ERROR') {
        clearTimer();
        setIsChallengeActive(false);
        let errorMsg = data.message || 'Verification failed. Please try again.';
        if (data.code === 'auth/invalid-phone-number') {
          errorMsg = 'Invalid mobile number. Please check and try again.';
        } else if (data.code === 'auth/too-many-requests') {
          errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
        } else if (data.code === 'auth/quota-exceeded') {
          errorMsg = 'SMS quota reached. Please try again later.';
        }
        onErrorRef.current(errorMsg);
        onCloseRef.current();
      }
    } catch (e) {
      console.warn('Firebase Recaptcha message parse error:', e);
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    clearTimer();
    setIsChallengeActive(false);
    onErrorRef.current(
      `Network connection error: ${nativeEvent.description || 'Unable to connect to verification server'}. Please retry.`
    );
    onCloseRef.current();
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    clearTimer();
    setIsChallengeActive(false);
    onErrorRef.current(
      `Verification server error (${nativeEvent.statusCode}). Please retry.`
    );
    onCloseRef.current();
  };

  const tablet = isTablet();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.cardContainer,
            tablet ? styles.tabletCard : styles.mobileCard,
            isChallengeActive && styles.challengedCard,
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.headerTitle}>Security Verification</Text>
            <TouchableOpacity
              onPress={handleCancel}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle / Status */}
          {!isChallengeActive && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="large" color="#152238" style={styles.spinner} />
              <Text style={styles.statusText}>
                Verifying your device with Firebase...
              </Text>
              <Text style={styles.hintText}>
                This keeps your HINCH MART account secure.
              </Text>
            </View>
          )}

          {/* WebView Container */}
          {(() => {
            const RNWebView = WebView as any;
            return (
              <View
                style={[
                  styles.webViewWrapper,
                  isChallengeActive ? styles.webViewVisible : styles.webViewHidden,
                ]}
              >
                <RNWebView
                  ref={webViewRef}
                  source={{
                    html: htmlContent,
                    baseUrl: `https://${firebaseConfig.authDomain}`,
                  }}
                  originWhitelist={ALLOWED_ORIGINS}
                  onMessage={handleMessage}
                  onError={handleWebViewError}
                  onHttpError={handleHttpError}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  sharedCookiesEnabled={true}
                  thirdPartyCookiesEnabled={true}
                  allowsInlineMediaPlayback={true}
                  mixedContentMode="always"
                  style={styles.webView}
                />
              </View>
            );
          })()}

          {/* Cancel action */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  mobileCard: {
    width: '100%',
    maxWidth: 360,
  },
  tabletCard: {
    width: 440,
    maxWidth: '85%',
  },
  challengedCard: {
    width: '100%',
    maxWidth: 400,
    height: 540,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  spinner: {
    marginBottom: 14,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  webViewWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  webViewHidden: {
    height: 1,
    opacity: 0.01,
  },
  webViewVisible: {
    flex: 1,
    height: 380,
    opacity: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});
