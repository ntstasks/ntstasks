const { Notification } = require('../models');

/**
 * Creates a notification for a user.
 * @param {Object} params
 * @param {number} params.userId - Recipient user ID
 * @param {number} [params.senderId] - Sending user ID
 * @param {number} [params.taskId] - Associated task ID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Body text
 * @param {string} [params.type] - Notification type
 * @param {string} [params.link] - Actionable URL or route
 */
async function createNotification({ userId, senderId = null, taskId = null, title, message, type = 'general', link = null }) {
  try {
    return await Notification.create({
      user_id: userId,
      sender_id: senderId,
      task_id: taskId,
      title,
      message,
      type,
      link,
      is_read: false
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
}

module.exports = { createNotification };

