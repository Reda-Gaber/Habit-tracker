// Notification helpers - uses the Web Notifications API.
// For scheduled/local notifications on mobile PWAs we rely on the
// service worker + periodic checks while the app is open, plus
// requesting permission upfront.

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function showNotification(title, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      reg.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        ...options,
      });
      return;
    }
  }
  // Fallback
  new Notification(title, options);
}

// Checks habit reminder times against the current time (called periodically)
export function timeMatches(reminderTime) {
  if (!reminderTime) return false;
  const now = new Date();
  const [h, m] = reminderTime.split(":").map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}
