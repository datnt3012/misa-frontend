// Test utility to verify fallback system works
import { notificationApi } from '@/api/notification.api';

export const testNotificationFallback = async () => {
  console.log('🧪 Testing notification fallback...');
  
  try {
    const result = await notificationApi.getNotifications({ limit: 10 });
    console.log('✅ Notification API result:', result);
    
    if (result.notifications && result.notifications.length > 0) {
      console.log('📱 Mock notifications loaded successfully');
      return true;
    } else {
      console.log('⚠️ No notifications returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Notification fallback test failed:', error);
    return false;
  }
};

// Auto-test when module loads (only in development)
// Disabled to prevent 401 errors when user is not logged in
// if (import.meta.env.DEV) {
//   setTimeout(() => {
//     testNotificationFallback();
//   }, 2000);
// }
