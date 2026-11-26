/**
 * Safe notification service (No-op when notifications table is removed)
 */
async function createNotification() {
  return null;
}

module.exports = { createNotification };
