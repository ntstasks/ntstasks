const { TaskActivityLog, Task, User, Employee } = require('../models');

const getActivityLogs = async (req, res) => {
  try {
    const { task_id, limit = 50, page = 1 } = req.query;
    const where = {};
    if (task_id) {
      where.task_id = parseInt(task_id, 10);
    }

    const offset = (page - 1) * limit;

    const { count, rows: logs } = await TaskActivityLog.findAndCountAll({
      where,
      include: [
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status', 'priority']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name', 'employee_id'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    return res.json({
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      logs
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return res.status(500).json({ message: 'Failed to retrieve activity logs.' });
  }
};

module.exports = { getActivityLogs };

