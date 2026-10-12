import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { firebaseConfig } from '../../config/firebase';

interface FirebaseRecaptchaModalProps {
  visible: boolean;
  phoneNumber: string;
  onSuccess: (verificationId: string) => void;
  onError: (errorMessage: string) => void;
  onClose: () => void;
}

export function FirebaseRecaptchaModal({
  visible,
  phoneNumber,
  onSuccess,
  onError,
  onClose,
}: FirebaseRecaptchaModalProps) {
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Safety timeout after 25 seconds
      timeoutRef.current = setTimeout(() => {
        onError('Verification timed out. Please check your internet connection and try again.');
        onClose();
      }, 25000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, onError, onClose]);

  if (!visible) return null;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification</title>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    #recaptcha-container { display: none; }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script>
    const config = ${JSON.stringify(firebaseConfig)};
    firebase.initializeApp(config);

    try {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: function(token) {
          // Solved invisibly by Google
        }
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SENDING' }));

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
      if (data.type === 'SENDING') {
        // Sending in progress
      } else if (data.type === 'SUCCESS') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onSuccess(data.verificationId);
      } else if (data.type === 'ERROR') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        let errorMsg = data.message || 'Verification failed. Please try again.';
        if (data.code === 'auth/invalid-phone-number') {
          errorMsg = 'Invalid mobile number. Please check and try again.';
        } else if (data.code === 'auth/too-many-requests') {
          errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
        } else if (data.code === 'auth/quota-exceeded') {
          errorMsg = 'SMS quota reached. Please try again later.';
        }
        onError(errorMsg);
      }
    } catch (e) {
      console.warn('Phone auth message parse error:', e);
    }
  };

  const RNWebView = WebView as any;

  return (
    <View style={styles.hiddenWrap} pointerEvents="none">
      <RNWebView
        ref={webViewRef}
        source={{
          html: htmlContent,
          baseUrl: `https://${firebaseConfig.authDomain}`,
        }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.hiddenWebView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenWrap: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenWebView: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
