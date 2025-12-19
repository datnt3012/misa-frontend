// Test utility to verify fallback system works
import { notificationApi } from '@/api/notification.api';
export const testNotificationFallback = async () => {
  try {
    const result = await notificationApi.getNotifications({ limit: 10 });
    if (result.notifications && result.notifications.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
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