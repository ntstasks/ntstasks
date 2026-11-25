const { Notification, User, Task } = require('../models');

const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    return res.json({
      notifications,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Failed to retrieve notifications.' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.update({ is_read: true }, { where: { user_id: req.user.id } });
      return res.json({ message: 'All notifications marked as read.' });
    }

    const notification = await Notification.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.is_read = true;
    await notification.save();

    return res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({ message: 'Failed to update notification.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.destroy({
      where: { id, user_id: req.user.id }
    });

    return res.json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ message: 'Failed to delete notification.' });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  deleteNotification
};

