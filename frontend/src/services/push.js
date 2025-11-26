import api from './api';

// Check if browser supports notifications
export const isSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Check notification permission
export const getPermission = () => {
  if (!isSupported()) return 'denied';
  return Notification.permission;
};

// Request notification permission
export const requestPermission = async () => {
  if (!isSupported()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// Register service worker
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  try {
    // Unregister old service workers first
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
      console.log('Unregistered old service worker');
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('Service Worker registered:', registration);

    // Wait for it to be active
    if (registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') {
            resolve();
          }
        });
      });
    }

    console.log('Service Worker is active and ready');
    return registration;

  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};

// Subscribe to push notifications
export const subscribeToPush = async () => {
  try {
    // Check if already subscribed
    const permission = await requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key from server
    const response = await api.get('/notify/vapid-public-key');
    const vapidPublicKey = response.data.publicKey;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('Push subscription:', subscription);

    // Send subscription to server
    await api.post('/notify/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      }
    });

    console.log('✅ Successfully subscribed to push notifications');
    return true;

  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    throw error;
  }
};

// Check if user is subscribed
export const isSubscribed = async () => {
  try {
    if (!isSupported()) return false;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;

  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
  }
};

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}