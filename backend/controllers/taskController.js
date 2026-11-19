const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const {
  sequelize,
  Task,
  TaskAssignment,
  TaskCategory,
  Employee,
  Department,
  User,
  TaskComment,
  TaskAttachment,
  TaskActivityLog,
  TaskStatusHistory
} = require('../models');
const { getISTDateString, getISTMonthString, getNowIST } = require('../utils/dateUtils');
const { logTaskActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationService');

// Helper: Format Task with calculated flags (overdue, approaching deadline)
const formatTask = (task) => {
  const plain = task.toJSON ? task.toJSON() : task;
  const now = getNowIST();
  const todayStr = getISTDateString();

  let isOverdue = false;
  let isDeadlineApproaching = false;

  if (plain.due_date && plain.status !== 'completed' && plain.status !== 'cancelled') {
    const dueDate = new Date(plain.due_date);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    if (plain.due_date < todayStr) {
      isOverdue = true;
    } else if (diffDays >= 0 && diffDays <= 3) {
      isDeadlineApproaching = true;
    }
  }

  return {
    ...plain,
    is_overdue: isOverdue,
    is_deadline_approaching: isDeadlineApproaching
  };
};

// GET all tasks (filtered by user role and query parameters)
const getAllTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      category_id,
      department_id,
      employee_id,
      month, // Format: YYYY-MM
      is_monthly_planned,
      start_date,
      end_date,
      search,
      sort_by = 'due_date',
      sort_order = 'ASC',
      page = 1,
      limit = 100
    } = req.query;

    const taskWhere = {};
    const employeeWhere = {};

    // Status filter
    if (status && status !== 'all') {
      taskWhere.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      taskWhere.priority = priority;
    }

    // Category filter
    if (category_id && category_id !== 'all') {
      taskWhere.category_id = category_id;
    }

    // Month filter for Monthly Planner
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

      taskWhere[Op.or] = [
        { planned_month: month },
        {
          planned_month: null,
          due_date: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      ];
    }

    if (is_monthly_planned !== undefined) {
      taskWhere.is_monthly_planned = is_monthly_planned === 'true';
    }

    // Date range filter
    if (start_date && end_date) {
      taskWhere.due_date = {
        [Op.between]: [start_date, end_date]
      };
    } else if (start_date) {
      taskWhere.due_date = { [Op.gte]: start_date };
    } else if (end_date) {
      taskWhere.due_date = { [Op.lte]: end_date };
    }

    // Search filter
    if (search) {
      const term = `%${search.trim()}%`;
      taskWhere[Op.or] = [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } }
      ];
    }

    // Specific employee filter (or role restriction)
    let requiredEmployeeAssignment = false;
    if (req.user.role === 'employee') {
      // Employees ONLY see tasks they created or are assigned to!
      const userEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
      if (!userEmployee) {
        return res.json({ tasks: [], total: 0 });
      }
      requiredEmployeeAssignment = true;
      employeeWhere.id = userEmployee.id;
    } else if (employee_id && employee_id !== 'all') {
      requiredEmployeeAssignment = true;
      employeeWhere.id = parseInt(employee_id, 10);
    }

    if (department_id && department_id !== 'all') {
      taskWhere.department_id = parseInt(department_id, 10);
    }

    // Sorting options
    let order = [['due_date', 'ASC']];
    if (sort_by === 'priority') {
      order = [['priority', sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
    } else if (sort_by === 'created_at') {
      order = [['created_at', sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
    } else if (sort_by === 'progress') {
      order = [['progress', sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
    } else if (sort_by === 'title') {
      order = [['title', sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
    } else {
      order = [['due_date', sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
    }

    const offset = (page - 1) * limit;

    const { count, rows: tasks } = await Task.findAndCountAll({
      where: taskWhere,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: TaskCategory,
          as: 'category',
          attributes: ['id', 'name', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name'] }]
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name'] }]
        },
        {
          model: Employee,
          as: 'assigned_employees',
          where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
          required: requiredEmployeeAssignment,
          through: { attributes: [] },
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: User, as: 'user', attributes: ['id', 'email', 'role'] }
          ]
        },
        {
          model: TaskComment,
          as: 'comments',
          attributes: ['id']
        },
        {
          model: TaskAttachment,
          as: 'attachments',
          attributes: ['id', 'file_name', 'file_size', 'file_type']
        }
      ],
      order,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true
    });

    const formatted = tasks.map(formatTask);

    return res.json({
      tasks: formatted,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    return res.status(500).json({ message: 'Failed to retrieve tasks.' });
  }
};

// GET single task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: TaskCategory,
          as: 'category'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee' }]
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee' }]
        },
        {
          model: Employee,
          as: 'assigned_employees',
          through: { attributes: [] },
          include: [
            { model: Department, as: 'department' },
            { model: User, as: 'user', attributes: ['id', 'email', 'role'] }
          ]
        },
        {
          model: TaskComment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'email', 'role'],
              include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name', 'avatar_url'] }]
            }
          ],
          order: [['created_at', 'ASC']]
        },
        {
          model: TaskAttachment,
          as: 'attachments',
          include: [
            {
              model: User,
              as: 'uploader',
              attributes: ['id', 'email'],
              include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name'] }]
            }
          ]
        },
        {
          model: TaskActivityLog,
          as: 'activity_logs',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'role'],
              include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name'] }]
            }
          ],
          order: [['created_at', 'DESC']]
        },
        {
          model: TaskStatusHistory,
          as: 'status_history',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email'],
              include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name'] }]
            }
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role check: Employee can only view if creator or assigned
    if (req.user.role === 'employee') {
      const userEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
      const isAssigned = task.assigned_employees.some((e) => e.id === userEmployee?.id);
      const isCreator = task.creator_id === req.user.id;
      if (!isAssigned && !isCreator) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this task.' });
      }
    }

    return res.json({ task: formatTask(task) });
  } catch (error) {
    console.error('Get task by ID error:', error);
    return res.status(500).json({ message: 'Failed to retrieve task details.' });
  }
};

// CREATE Task
const createTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      title,
      description,
      department_id,
      category_id,
      start_date,
      due_date,
      priority = 'medium',
      status = 'not_started',
      progress = 0,
      estimated_hours = 0,
      actual_hours = 0,
      is_monthly_planned = false,
      planned_month,
      assigned_employee_ids = []
    } = req.body;

    if (!title || !title.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'Task title is required.' });
    }

    // Compute planned month if monthly planned
    let finalMonth = planned_month;
    if (due_date) {
      const dueMonth = due_date.substring(0, 7);
      // If planned_month was not provided or was default current month while due_date is in another month
      if (!finalMonth || finalMonth === getISTMonthString()) {
        finalMonth = dueMonth;
      }
    }
    if (!finalMonth) {
      finalMonth = getISTMonthString();
    }

    const currentEmployee = await Employee.findOne({ where: { user_id: req.user.id } });

    // Determine department (defaults to creator's department if not explicitly chosen)
    const finalDepartmentId = department_id
      ? parseInt(department_id, 10)
      : (currentEmployee?.department_id || null);

    // Determine assignees (Admin can assign to any employee/admin; Employees assign strictly to themselves)
    let finalAssigneeIds = [];
    if (req.user.role === 'admin' && Array.isArray(assigned_employee_ids) && assigned_employee_ids.length > 0) {
      finalAssigneeIds = assigned_employee_ids;
    } else if (currentEmployee) {
      finalAssigneeIds = [currentEmployee.id];
    }

    let finalCompletedDate = null;
    if (status === 'completed') {
      if (due_date && due_date < getISTDateString()) {
        finalCompletedDate = new Date(`${due_date}T18:00:00+05:30`);
      } else {
        finalCompletedDate = new Date();
      }
    }

    const task = await Task.create(
      {
        title: title.trim(),
        description: description ? description.trim() : null,
        department_id: finalDepartmentId,
        category_id: category_id ? parseInt(category_id, 10) : null,
        creator_id: req.user.id,
        assigned_by: req.user.id,
        start_date: start_date || getISTDateString(),
        due_date: due_date || null,
        completed_date: finalCompletedDate,
        priority,
        status,
        progress: parseInt(progress, 10) || 0,
        estimated_hours: parseFloat(estimated_hours) || 0,
        actual_hours: parseFloat(actual_hours) || 0,
        is_monthly_planned: Boolean(is_monthly_planned),
        planned_month: finalMonth
      },
      { transaction: t }
    );

    // Create assignments
    for (const empId of finalAssigneeIds) {
      await TaskAssignment.create(
        {
          task_id: task.id,
          employee_id: empId
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Log Activity outside transaction
    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: 'created',
      newValue: { title: task.title, status: task.status, priority: task.priority },
      details: `Task "${task.title}" was created by ${req.user.employee?.first_name || 'User'}.`
    });

    // Notify assigned employees
    for (const empId of finalAssigneeIds) {
      const emp = await Employee.findByPk(empId);
      if (emp && emp.user_id !== req.user.id) {
        await createNotification({
          userId: emp.user_id,
          senderId: req.user.id,
          taskId: task.id,
          title: 'New Task Assigned',
          message: `${req.user.employee?.first_name || 'Admin'} assigned you to task: "${task.title}".`,
          type: 'task_assigned',
          link: `/tasks/${task.id}`
        });
      }
    }

    const createdTask = await Task.findByPk(task.id, {
      include: [
        { model: TaskCategory, as: 'category' },
        { model: Employee, as: 'assigned_employees', through: { attributes: [] } }
      ]
    });

    return res.status(201).json({
      message: 'Task created successfully.',
      task: formatTask(createdTask)
    });
  } catch (error) {
    await t.rollback();
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Failed to create task: ' + error.message });
  }
};

// UPDATE Task
const updateTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [{ model: Employee, as: 'assigned_employees', through: { attributes: [] } }],
      transaction: t
    });

    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role check: Employee can only update tasks assigned to them or created by them
    const currentEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
    const isAssigned = task.assigned_employees.some((e) => e.id === currentEmployee?.id);
    const isCreator = task.creator_id === req.user.id;

    if (req.user.role === 'employee' && !isAssigned && !isCreator) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied: You are not authorized to update this task.' });
    }

    const {
      title,
      description,
      department_id,
      category_id,
      start_date,
      due_date,
      priority,
      status,
      progress,
      estimated_hours,
      actual_hours,
      is_monthly_planned,
      planned_month,
      assigned_employee_ids,
      notes
    } = req.body;

    const previousStatus = task.status;
    const previousProgress = task.progress;

    // Admin, Task Creator, or Assigned Employee can update all fields & assignments
    if (req.user.role === 'admin' || isCreator || isAssigned) {
      if (title) task.title = title.trim();
      if (description !== undefined) task.description = description ? description.trim() : null;
      if (department_id !== undefined) task.department_id = department_id ? parseInt(department_id, 10) : null;
      if (category_id !== undefined) task.category_id = category_id ? parseInt(category_id, 10) : null;
      if (start_date !== undefined) task.start_date = start_date;
      if (due_date !== undefined) {
        task.due_date = due_date;
        if (due_date && (!planned_month || task.planned_month === getISTMonthString())) {
          task.planned_month = due_date.substring(0, 7);
        }
      }
      if (priority) task.priority = priority;
      if (estimated_hours !== undefined) task.estimated_hours = parseFloat(estimated_hours) || 0;
      if (is_monthly_planned !== undefined) task.is_monthly_planned = Boolean(is_monthly_planned);
      if (planned_month !== undefined && planned_month) task.planned_month = planned_month;

      // Update assignees (Only Admin can reassign tasks to other members; Employees keep self-assignment)
      if (Array.isArray(assigned_employee_ids)) {
        let targetAssignees = assigned_employee_ids;
        if (req.user.role !== 'admin') {
          targetAssignees = currentEmployee ? [currentEmployee.id] : [];
        }
        await TaskAssignment.destroy({ where: { task_id: task.id }, transaction: t });
        for (const empId of targetAssignees) {
          await TaskAssignment.create({ task_id: task.id, employee_id: empId }, { transaction: t });
        }
      }
    }

    // Both Admin and Employee can update status, progress, and actual_hours
    if (status && status !== task.status) {
      task.status = status;
      if (status === 'completed') {
        if (!task.completed_date) {
          if (task.due_date && task.due_date < getISTDateString()) {
            task.completed_date = new Date(`${task.due_date}T18:00:00+05:30`);
          } else {
            task.completed_date = new Date();
          }
        }
        task.progress = 100;
        task.approval_status = req.user.role === 'admin' ? 'approved' : 'pending_review';
      } else {
        task.completed_date = null;
      }
    }

    if (progress !== undefined) {
      task.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
      if (task.progress === 100 && task.status !== 'completed') {
        task.status = 'completed';
        if (!task.completed_date) {
          if (task.due_date && task.due_date < getISTDateString()) {
            task.completed_date = new Date(`${task.due_date}T18:00:00+05:30`);
          } else {
            task.completed_date = new Date();
          }
        }
        task.approval_status = req.user.role === 'admin' ? 'approved' : 'pending_review';
      }
    }

    if (actual_hours !== undefined) {
      task.actual_hours = parseFloat(actual_hours) || 0;
    }

    await task.save({ transaction: t });

    // Record status history if changed
    if (status && status !== previousStatus) {
      await TaskStatusHistory.create(
        {
          task_id: task.id,
          changed_by: req.user.id,
          from_status: previousStatus,
          to_status: status,
          notes: notes || `Status changed from ${previousStatus} to ${status}.`
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Log Activity
    if (status && status !== previousStatus) {
      await logTaskActivity({
        taskId: task.id,
        userId: req.user.id,
        action: 'status_changed',
        previousValue: previousStatus,
        newValue: status,
        details: `Status updated from ${previousStatus} to ${status}.`
      });

      // Notify task creator if someone else changed status
      if (task.creator_id !== req.user.id) {
        await createNotification({
          userId: task.creator_id,
          senderId: req.user.id,
          taskId: task.id,
          title: 'Task Status Updated',
          message: `Task "${task.title}" status changed to ${status}.`,
          type: 'status_changed',
          link: `/tasks/${task.id}`
        });
      }
    } else if (progress !== undefined && progress !== previousProgress) {
      await logTaskActivity({
        taskId: task.id,
        userId: req.user.id,
        action: 'progress_updated',
        previousValue: `${previousProgress}%`,
        newValue: `${task.progress}%`,
        details: `Progress adjusted to ${task.progress}%.`
      });
    }

    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: TaskCategory, as: 'category' },
        { model: Employee, as: 'assigned_employees', through: { attributes: [] } }
      ]
    });

    return res.json({
      message: 'Task updated successfully.',
      task: formatTask(updatedTask)
    });
  } catch (error) {
    await t.rollback();
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Failed to update task: ' + error.message });
  }
};

// QUICK STATUS UPDATE (for Kanban Drag and Drop)
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const task = await Task.findByPk(id, {
      include: [{ model: Employee, as: 'assigned_employees', through: { attributes: [] } }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role check
    if (req.user.role === 'employee') {
      const currentEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
      const isAssigned = task.assigned_employees.some((e) => e.id === currentEmployee?.id);
      const isCreator = task.creator_id === req.user.id;
      if (!isAssigned && !isCreator) {
        return res.status(403).json({ message: 'Access denied: You cannot move this task.' });
      }
    }

    const previousStatus = task.status;
    task.status = status;
    if (status === 'completed') {
      if (!task.completed_date) {
        if (task.due_date && task.due_date < getISTDateString()) {
          task.completed_date = new Date(`${task.due_date}T18:00:00+05:30`);
        } else {
          task.completed_date = new Date();
        }
      }
      task.progress = 100;
      task.approval_status = req.user.role === 'admin' ? 'approved' : 'pending_review';
    } else {
      task.completed_date = null;
    }

    await task.save();

    await TaskStatusHistory.create({
      task_id: task.id,
      changed_by: req.user.id,
      from_status: previousStatus,
      to_status: status,
      notes: 'Updated via Kanban board drag-and-drop.'
    });

    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: 'status_changed',
      previousValue: previousStatus,
      newValue: status,
      details: `Moved task to ${status} via Kanban.`
    });

    return res.json({
      message: 'Status updated successfully.',
      task: formatTask(task)
    });
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({ message: 'Failed to update status.' });
  }
};

// REVIEW TASK (Admin only: Approve or Request Changes)
const reviewTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, feedback } = req.body; // action: 'approve' | 'request_changes' | 'reopen'

    const task = await Task.findByPk(id, {
      include: [{ model: Employee, as: 'assigned_employees', through: { attributes: [] } }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (action === 'approve') {
      task.approval_status = 'approved';
      task.status = 'completed';
      task.completed_date = task.completed_date || new Date();
      task.feedback = feedback ? feedback.trim() : 'Approved by administrator.';
    } else if (action === 'request_changes') {
      task.approval_status = 'changes_requested';
      task.status = 'in_progress';
      task.progress = Math.min(task.progress, 85);
      task.feedback = feedback ? feedback.trim() : 'Changes requested by administrator.';
    } else if (action === 'reopen') {
      task.approval_status = 'none';
      task.status = 'in_progress';
      task.completed_date = null;
      task.feedback = feedback ? feedback.trim() : 'Task reopened.';
    } else {
      return res.status(400).json({ message: 'Invalid action. Choose approve, request_changes, or reopen.' });
    }

    await task.save();

    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: action === 'approve' ? 'approved' : action === 'request_changes' ? 'changes_requested' : 'reopened',
      details: feedback || `Admin performed review action: ${action}.`
    });

    // Notify assigned employees
    for (const emp of task.assigned_employees) {
      if (emp.user_id !== req.user.id) {
        await createNotification({
          userId: emp.user_id,
          senderId: req.user.id,
          taskId: task.id,
          title: action === 'approve' ? 'Task Approved!' : action === 'request_changes' ? 'Changes Requested on Task' : 'Task Reopened',
          message: `Admin ${action === 'approve' ? 'approved' : action === 'request_changes' ? 'requested changes for' : 'reopened'} "${task.title}". Feedback: ${task.feedback}`,
          type: 'review_status',
          link: `/tasks/${task.id}`
        });
      }
    }

    return res.json({
      message: `Task has been ${action === 'approve' ? 'approved' : action === 'request_changes' ? 'marked for revisions' : 'reopened'}.`,
      task: formatTask(task)
    });
  } catch (error) {
    console.error('Review task error:', error);
    return res.status(500).json({ message: 'Failed to process task review.' });
  }
};

// DELETE Task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role check: Only admin or creator (if employee) can delete
    if (req.user.role !== 'admin' && task.creator_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete this task.' });
    }

    await task.destroy();

    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Failed to delete task.' });
  }
};

// ADD COMMENT to Task
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment content cannot be empty.' });
    }

    const task = await Task.findByPk(id, {
      include: [{ model: Employee, as: 'assigned_employees', through: { attributes: [] } }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const newComment = await TaskComment.create({
      task_id: task.id,
      user_id: req.user.id,
      comment: comment.trim()
    });

    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: 'comment_added',
      details: `Comment added by ${req.user.employee?.first_name || 'User'}.`
    });

    // Notify assigned employees and creator
    const recipients = new Set();
    if (task.creator_id !== req.user.id) recipients.add(task.creator_id);
    task.assigned_employees.forEach((emp) => {
      if (emp.user_id !== req.user.id) recipients.add(emp.user_id);
    });

    for (const recipientId of recipients) {
      await createNotification({
        userId: recipientId,
        senderId: req.user.id,
        taskId: task.id,
        title: 'New Comment on Task',
        message: `${req.user.employee?.first_name || 'A team member'} commented on "${task.title}": "${comment.trim().substring(0, 80)}..."`,
        type: 'comment_added',
        link: `/tasks/${task.id}`
      });
    }

    const fullComment = await TaskComment.findByPk(newComment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'email', 'role'],
          include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name', 'avatar_url'] }]
        }
      ]
    });

    return res.status(201).json({
      message: 'Comment added successfully.',
      comment: fullComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ message: 'Failed to add comment.' });
  }
};

// UPLOAD ATTACHMENT
const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const attachment = await TaskAttachment.create({
      task_id: task.id,
      user_id: req.user.id,
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_size: req.file.size,
      file_type: req.file.mimetype
    });

    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: 'attachment_uploaded',
      details: `File "${req.file.originalname}" was attached.`
    });

    return res.status(201).json({
      message: 'Attachment uploaded successfully.',
      attachment
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return res.status(500).json({ message: 'Failed to upload attachment.' });
  }
};

// DELETE ATTACHMENT
const deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const attachment = await TaskAttachment.findByPk(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }

    if (req.user.role !== 'admin' && attachment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You cannot delete this attachment.' });
    }

    // Try to remove file from disk
    const filePath = path.resolve(__dirname, '..', attachment.file_path.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachment.destroy();

    return res.json({ message: 'Attachment deleted successfully.' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return res.status(500).json({ message: 'Failed to delete attachment.' });
  }
};

// GET CARRY FORWARD CANDIDATES (Unfinished tasks from previous month/prior periods)
const getCarryForwardCandidates = async (req, res) => {
  try {
    const { source_month, target_month } = req.query;

    const now = new Date();
    const defaultTarget = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const resolvedTarget = target_month || defaultTarget;

    // Default source month to previous month relative to target
    let resolvedSource = source_month;
    if (!resolvedSource) {
      const [ty, tm] = resolvedTarget.split('-').map(Number);
      const prevDate = new Date(ty, tm - 2, 1);
      resolvedSource = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const taskWhere = {
      status: {
        [Op.in]: ['not_started', 'in_progress', 'on_hold']
      }
    };

    if (resolvedSource === 'all_prior') {
      taskWhere[Op.or] = [
        { planned_month: { [Op.lt]: resolvedTarget } },
        { planned_month: null, due_date: { [Op.lt]: `${resolvedTarget}-01` } }
      ];
    } else {
      taskWhere.planned_month = resolvedSource;
    }

    const include = [
      {
        model: TaskCategory,
        as: 'category',
        attributes: ['id', 'name', 'color']
      },
      {
        model: Employee,
        as: 'assigned_employees',
        attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
        through: { attributes: [] }
      }
    ];

    let tasks = await Task.findAll({
      where: taskWhere,
      include,
      order: [['due_date', 'ASC'], ['id', 'ASC']]
    });

    if (req.user.role === 'employee') {
      const userEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
      const empId = userEmployee?.id;
      tasks = tasks.filter((t) => {
        const isAssigned = t.assigned_employees && t.assigned_employees.some((e) => e.id === empId);
        const isCreator = t.creator_id === req.user.id;
        return isAssigned || isCreator;
      });
    }

    const formattedTasks = tasks.map(formatTask);

    return res.json({
      count: formattedTasks.length,
      source_month: resolvedSource,
      target_month: resolvedTarget,
      tasks: formattedTasks
    });
  } catch (error) {
    console.error('getCarryForwardCandidates error:', error);
    return res.status(500).json({ message: 'Failed to fetch carry-forward candidates.' });
  }
};

// CARRY FORWARD MULTIPLE TASKS TO TARGET MONTH
const carryForwardTasks = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      task_ids,
      target_month,
      update_due_dates = true,
      new_due_date = null
    } = req.body;

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Please select at least one task to carry forward.' });
    }

    if (!target_month || !/^\d{4}-\d{2}$/.test(target_month)) {
      await t.rollback();
      return res.status(400).json({ message: 'Valid target month in YYYY-MM format is required.' });
    }

    const [ty, tm] = target_month.split('-').map(Number);
    const lastDayOfMonth = new Date(ty, tm, 0).getDate();
    const defaultNewDueDate = `${target_month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const currentEmployee = req.user.role === 'employee'
      ? await Employee.findOne({ where: { user_id: req.user.id } })
      : null;

    const updatedTasks = [];

    for (const taskId of task_ids) {
      const task = await Task.findByPk(taskId, {
        include: [
          {
            model: Employee,
            as: 'assigned_employees',
            through: { attributes: [] }
          }
        ],
        transaction: t
      });

      if (!task) continue;

      // Role authorization check for employee
      if (req.user.role === 'employee') {
        const isAssigned = task.assigned_employees.some((e) => e.id === currentEmployee?.id);
        const isCreator = task.creator_id === req.user.id;
        if (!isAssigned && !isCreator) {
          continue;
        }
      }

      // Skip already completed or cancelled tasks
      if (task.status === 'completed' || task.status === 'cancelled') {
        continue;
      }

      const oldMonth = task.planned_month;
      const oldDueDate = task.due_date;

      task.planned_month = target_month;
      task.is_monthly_planned = true;

      if (new_due_date) {
        task.due_date = new_due_date;
      } else if (update_due_dates) {
        if (!task.due_date || task.due_date < `${target_month}-01`) {
          task.due_date = defaultNewDueDate;
        }
      }

      await task.save({ transaction: t });

      await logTaskActivity({
        taskId: task.id,
        userId: req.user.id,
        action: 'carried_forward',
        previousValue: oldMonth || 'None',
        newValue: target_month,
        details: `Task carried forward from ${oldMonth || 'previous period'} to ${target_month}${task.due_date !== oldDueDate ? ` (Deadline adjusted to ${task.due_date})` : ''}.`
      });

      updatedTasks.push(task);
    }

    await t.commit();

    return res.json({
      message: `Successfully carried forward ${updatedTasks.length} task${updatedTasks.length === 1 ? '' : 's'} to ${target_month}.`,
      updated_count: updatedTasks.length,
      target_month,
      tasks: updatedTasks
    });
  } catch (error) {
    await t.rollback();
    console.error('carryForwardTasks error:', error);
    return res.status(500).json({ message: 'Failed to carry forward tasks.' });
  }
};

// CARRY FORWARD SINGLE TASK
const carryForwardSingleTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_month, update_due_date = true, new_due_date = null } = req.body;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'assigned_employees',
          through: { attributes: [] }
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (req.user.role === 'employee') {
      const currentEmployee = await Employee.findOne({ where: { user_id: req.user.id } });
      const isAssigned = task.assigned_employees.some((e) => e.id === currentEmployee?.id);
      const isCreator = task.creator_id === req.user.id;
      if (!isAssigned && !isCreator) {
        return res.status(403).json({ message: 'Access denied: You are not authorized to modify this task.' });
      }
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      return res.status(400).json({ message: 'Only incomplete tasks can be carried forward.' });
    }

    // Determine target month
    let resolvedTarget = target_month;
    if (!resolvedTarget) {
      const baseMonth = task.planned_month || getISTMonthString();
      const [by, bm] = baseMonth.split('-').map(Number);
      const nextDate = new Date(by, bm, 1);
      resolvedTarget = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const [ty, tm] = resolvedTarget.split('-').map(Number);
    const lastDayOfMonth = new Date(ty, tm, 0).getDate();
    const defaultNewDueDate = `${resolvedTarget}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const oldMonth = task.planned_month;
    const oldDueDate = task.due_date;

    task.planned_month = resolvedTarget;
    task.is_monthly_planned = true;

    if (new_due_date) {
      task.due_date = new_due_date;
    } else if (update_due_date) {
      if (!task.due_date || task.due_date < `${resolvedTarget}-01`) {
        task.due_date = defaultNewDueDate;
      }
    }

    await task.save();

    await logTaskActivity({
      taskId: task.id,
      userId: req.user.id,
      action: 'carried_forward',
      previousValue: oldMonth || 'None',
      newValue: resolvedTarget,
      details: `Task carried forward from ${oldMonth || 'previous period'} to ${resolvedTarget}${task.due_date !== oldDueDate ? ` (Deadline adjusted to ${task.due_date})` : ''}.`
    });

    return res.json({
      message: `Task successfully carried forward to ${resolvedTarget}.`,
      task: formatTask(task)
    });
  } catch (error) {
    console.error('carryForwardSingleTask error:', error);
    return res.status(500).json({ message: 'Failed to carry forward task.' });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  reviewTask,
  deleteTask,
  addComment,
  uploadAttachment,
  deleteAttachment,
  getCarryForwardCandidates,
  carryForwardTasks,
  carryForwardSingleTask
};

