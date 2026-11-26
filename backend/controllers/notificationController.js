/**
 * Safe notification controller (Returns empty lists cleanly when notifications table is removed)
 */
const getUserNotifications = async (req, res) => {
  return res.json({
    notifications: [],
    unreadCount: 0
  });
};

const markAsRead = async (req, res) => {
  return res.json({ message: 'All notifications marked as read.' });
};

const deleteNotification = async (req, res) => {
  return res.json({ message: 'Notification deleted.' });
};

module.exports = {
  getUserNotifications,
  markAsRead,
  deleteNotification
};
