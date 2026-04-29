import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert.
 * - Native: uses React Native's Alert.alert
 * - Web: uses window.alert (since RN's Alert.alert is a no-op on web)
 *
 * For confirmations, prefer crossConfirm.
 */
export function crossAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}

/**
 * Cross-platform confirm. Returns true if confirmed.
 */
export function crossConfirm(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
    }
    return Promise.resolve(false);
  }
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'OK', onPress: () => resolve(true) },
      ],
    );
  });
}
