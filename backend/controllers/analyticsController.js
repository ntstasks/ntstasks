const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  Task,
  TaskAssignment,
  Employee,
  Department,
  User,
  TaskActivityLog,
  TaskCategory
} = require('../models');
const { getISTDateString, getISTMonthString, getNowIST } = require('../utils/dateUtils');

// Helper: Get Date ranges
const getDateRange = (filterType, customStart, customEnd) => {
  const now = new Date();
  let start = null;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (filterType === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (filterType === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  } else if (filterType === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (filterType === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (filterType === 'custom' && customStart && customEnd) {
    start = new Date(customStart + 'T00:00:00');
    end = new Date(customEnd + 'T23:59:59');
  }

  return { start, end };
};

// Helper: Determines the definitive schedule/target month of a task
const getTaskTargetMonth = (task) => {
  // If explicitly planned for a month, planned_month is definitive
  if (task.planned_month) {
    return task.planned_month;
  }
  // If task has due_date, the due_date's month is the definitive target deadline month
  if (task.due_date) {
    return task.due_date.substring(0, 7);
  }
  // If completed, use completed_date's month
  if (task.completed_date) {
    return getISTDateString(task.completed_date).substring(0, 7);
  }
  // Fallback to creation date in IST
  const createdAt = task.created_at || task.createdAt;
  if (createdAt) {
    return getISTDateString(createdAt).substring(0, 7);
  }
  return getISTMonthString();
};

const matchesMonth = (task, monthStr) => {
  return getTaskTargetMonth(task) === monthStr;
};

// Helper: Determines if a task was completed in the specified month (in IST)
const isTaskCompletedInMonth = (task, monthStr) => {
  if (task.status !== 'completed') return false;
  if (task.completed_date) {
    const compMonth = getISTDateString(task.completed_date).substring(0, 7);
    return compMonth === monthStr;
  }
  return getTaskTargetMonth(task) === monthStr;
};

// ADMIN DASHBOARD ANALYTICS
const getAdminDashboardStats = async (req, res) => {
  try {
    const now = getNowIST();
    const todayStr = getISTDateString();

    // Current Month & Previous Month for comparison
    const currentMonthStr = getISTMonthString();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = getISTMonthString(prevMonthDate);

    // 1. Employee Counts (Strictly role: 'employee' - do NOT count Admin accounts)
    const totalEmployees = await User.count({ where: { role: 'employee' } });
    const activeEmployees = await User.count({ where: { role: 'employee', is_active: true } });

    // 2. All Tasks Counts
    const allTasks = await Task.findAll({
      attributes: [
        'id',
        'status',
        'priority',
        'due_date',
        'completed_date',
        'created_at',
        'planned_month',
        'estimated_hours',
        'actual_hours'
      ]
    });

    const norm = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_').trim();

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => norm(t.status) === 'completed').length;
    const inProgressTasks = allTasks.filter((t) => norm(t.status) === 'in_progress').length;
    const onHoldTasks = allTasks.filter((t) => norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
    const notStartedTasks = allTasks.filter((t) => norm(t.status) === 'not_started').length;
    const pendingTasks = allTasks.filter((t) => norm(t.status) === 'not_started' || norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
    const overdueTasks = allTasks.filter(
      (t) => t.due_date && t.due_date < todayStr && norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled'
    ).length;

    const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Previous Month Stats for comparison
    const currentMonthTasks = allTasks.filter((t) => matchesMonth(t, currentMonthStr));
    const prevMonthTasks = allTasks.filter((t) => matchesMonth(t, prevMonthStr));

    const currentMonthCompleted = allTasks.filter((t) => isTaskCompletedInMonth(t, currentMonthStr)).length;
    const prevMonthCompleted = allTasks.filter((t) => isTaskCompletedInMonth(t, prevMonthStr)).length;

    const completionGrowth = prevMonthCompleted > 0
      ? Math.round(((currentMonthCompleted - prevMonthCompleted) / prevMonthCompleted) * 100)
      : (currentMonthCompleted > 0 ? 100 : 0);

    // 3. Status Distribution Chart
    const statusDistribution = [
      { name: 'Completed', value: completedTasks, color: '#10B981' },
      { name: 'In Progress', value: inProgressTasks, color: '#3B82F6' },
      { name: 'Pending / Not Started', value: notStartedTasks, color: '#F59E0B' },
      { name: 'On Hold', value: onHoldTasks, color: '#8B5CF6' },
      { name: 'Overdue', value: overdueTasks, color: '#EF4444' }
    ];

    // 4. Monthly Task Performance Trends (Custom Range & Dynamic Presets)
    const trendMonthsParam = req.query.trend_months;
    const startMonthParam = req.query.start_month; // 'YYYY-MM'
    const endMonthParam = req.query.end_month;     // 'YYYY-MM'

    let monthRange = [];

    if (startMonthParam && endMonthParam) {
      const [startYear, startM] = startMonthParam.split('-').map(Number);
      const [endYear, endM] = endMonthParam.split('-').map(Number);
      let cur = new Date(startYear, startM - 1, 1);
      const endLimit = new Date(endYear, endM - 1, 1);

      while (cur <= endLimit && monthRange.length < 48) {
        const mStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const mName = cur.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthRange.push({ mStr, mName });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    } else {
      const numMonths = Math.min(48, Math.max(1, parseInt(trendMonthsParam, 10) || 6));
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthRange.push({ mStr, mName });
      }
    }

    const monthlyPerformance = monthRange.map(({ mStr, mName }) => {
      const mTasks = allTasks.filter((t) => matchesMonth(t, mStr));
      const mCreated = mTasks.length;
      const mCompleted = allTasks.filter((t) => isTaskCompletedInMonth(t, mStr)).length;
      const mRemaining = Math.max(0, mCreated - mCompleted);
      const mRate = mCreated > 0 ? Math.round((mCompleted / mCreated) * 100) : 0;

      return {
        month: mName,
        monthKey: mStr,
        created: mCreated,
        completed: mCompleted,
        remaining: mRemaining,
        completionRate: mRate
      };
    });

    // 5. Employee Productivity Comparison (Strictly role: 'employee' - excludes Admin accounts)
    const employees = await Employee.findAll({
      include: [
        {
          model: User,
          as: 'user',
          where: { role: 'employee' },
          attributes: ['id', 'email', 'is_active', 'last_login']
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status', 'due_date', 'estimated_hours', 'actual_hours', 'created_at'],
          through: { attributes: [] }
        }
      ]
    });

    const employeeProductivity = employees.map((emp) => {
      const tasks = emp.tasks || [];
      const assigned = tasks.length;
      const comp = tasks.filter((t) => norm(t.status) === 'completed').length;
      const inProg = tasks.filter((t) => norm(t.status) === 'in_progress').length;
      const onHold = tasks.filter((t) => norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
      const notStarted = tasks.filter((t) => norm(t.status) === 'not_started').length;
      const pend = tasks.filter((t) => norm(t.status) === 'not_started' || norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
      const over = tasks.filter(
        (t) => t.due_date && t.due_date < todayStr && norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled'
      ).length;
      const rate = assigned > 0 ? Math.round((comp / assigned) * 100) : 0;

      return {
        id: emp.id,
        employee_id: emp.employee_id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: typeof emp.department === 'string' ? emp.department : (emp.department?.name || 'General'),
        designation: emp.designation,
        avatar_url: emp.avatar_url,
        assigned,
        completed: comp,
        in_progress: inProg,
        on_hold: onHold,
        not_started: notStarted,
        pending: pend,
        overdue: over,
        completion_rate: rate,
        last_activity: emp.user?.last_login || emp.created_at
      };
    });

    // 6. Department Performance (Dynamic by text department column)
    const deptMap = {};
    employees.forEach((emp) => {
      const dName = typeof emp.department === 'string' ? emp.department : (emp.department?.name || 'General');
      if (!deptMap[dName]) {
        deptMap[dName] = { assigned: 0, completed: 0, pending: 0, employees: 0 };
      }
      deptMap[dName].employees += 1;
      const tasks = emp.tasks || [];
      deptMap[dName].assigned += tasks.length;
      deptMap[dName].completed += tasks.filter((t) => norm(t.status) === 'completed').length;
      deptMap[dName].pending += tasks.filter((t) => norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled').length;
    });

    const departmentPerformance = Object.keys(deptMap).map((name, idx) => {
      const d = deptMap[name];
      const rate = d.assigned > 0 ? Math.round((d.completed / d.assigned) * 100) : 0;
      return {
        id: idx + 1,
        name,
        assigned: d.assigned,
        completed: d.completed,
        pending: d.pending,
        completion_rate: rate
      };
    });

    // 7. Daily / Weekly Activity Trend (Past 14 Days)
    const activityTrend = [];
    const activities = await TaskActivityLog.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: ['action', 'created_at']
    });

    for (let i = 13; i >= 0; i--) {
      const dayDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = getISTDateString(dayDate);
      const label = dayDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });

      const dayActivities = activities.filter((a) => {
        const c = a.created_at || a.createdAt;
        if (!c) return false;
        const str = getISTDateString(c);
        return str === dateKey;
      });
      const createdCount = dayActivities.filter((a) => a.action === 'created').length;
      const completedCount = dayActivities.filter((a) => a.action === 'status_changed' && a.new_value?.includes('completed')).length;
      const updatedCount = dayActivities.length;

      activityTrend.push({
        date: label,
        dateKey,
        created: createdCount,
        completed: completedCount,
        updated: updatedCount
      });
    }

    return res.json({
      cards: {
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        on_hold_tasks: onHoldTasks,
        on_hold: onHoldTasks,
        not_started_tasks: notStartedTasks,
        pending_tasks: pendingTasks,
        overdue_tasks: overdueTasks,
        overall_completion_rate: overallCompletionRate,
        comparison: {
          current_month_completed: currentMonthCompleted,
          prev_month_completed: prevMonthCompleted,
          growth_percentage: completionGrowth
        }
      },
      charts: {
        status_distribution: statusDistribution,
        monthly_performance: monthlyPerformance,
        employee_productivity: employeeProductivity.sort((a, b) => b.completed - a.completed),
        department_performance: departmentPerformance,
        activity_trend: activityTrend
      },
      employee_table: employeeProductivity
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return res.status(500).json({ message: 'Failed to calculate admin dashboard statistics.' });
  }
};

// EMPLOYEE INDIVIDUAL DASHBOARD STATS
const getEmployeeDashboardStats = async (req, res) => {
  try {
    const userEmployee = await Employee.findOne({
      where: { user_id: req.user.id }
    });

    if (!userEmployee) {
      return res.status(404).json({ message: 'Employee record not found for logged-in user.' });
    }

    const now = getNowIST();
    const todayStr = getISTDateString();
    const currentMonthStr = getISTMonthString();

    const tasks = await Task.findAll({
      include: [
        {
          model: Employee,
          as: 'assigned_employees',
          where: { id: userEmployee.id },
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: TaskCategory,
          as: 'category',
          attributes: ['name', 'color']
        }
      ],
      order: [['due_date', 'ASC']]
    });

    const norm = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => norm(t.status) === 'completed').length;
    const inProgressTasks = tasks.filter((t) => norm(t.status) === 'in_progress').length;
    const onHoldTasks = tasks.filter((t) => norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
    const notStartedTasks = tasks.filter((t) => norm(t.status) === 'not_started').length;
    const pendingTasks = tasks.filter((t) => norm(t.status) === 'not_started' || norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.due_date < todayStr && norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled'
    ).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Monthly Target & Progress
    const monthlyTasks = tasks.filter((t) => matchesMonth(t, currentMonthStr));
    const monthlyTotal = monthlyTasks.length;
    const monthlyCompleted = tasks.filter((t) => isTaskCompletedInMonth(t, currentMonthStr)).length;
    const monthlyRate = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

    // Category breakdown (defaults to 'General' instead of 'Uncategorized')
    const categoryCounts = {};
    tasks.forEach((t) => {
      const catName = t.category?.name || 'General';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryCounts).map((key) => ({
      name: key === 'Uncategorized' ? 'General' : key,
      value: categoryCounts[key]
    }));

    // Priority breakdown
    const priorityCounts = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    tasks.forEach((t) => {
      const p = (t.priority || 'medium').toLowerCase();
      if (p === 'critical') priorityCounts.Critical += 1;
      else if (p === 'high') priorityCounts.High += 1;
      else if (p === 'low') priorityCounts.Low += 1;
      else priorityCounts.Medium += 1;
    });

    const priorityDistribution = [
      { name: 'Critical', value: priorityCounts.Critical, color: '#EF4444' },
      { name: 'High', value: priorityCounts.High, color: '#F97316' },
      { name: 'Medium', value: priorityCounts.Medium, color: '#3B82F6' },
      { name: 'Low', value: priorityCounts.Low, color: '#64748B' }
    ].filter((item) => item.value > 0);

    // Status breakdown
    const statusDistribution = [
      { name: 'Completed', value: completedTasks, color: '#10B981' },
      { name: 'In Progress', value: inProgressTasks, color: '#3B82F6' },
      { name: 'Pending', value: pendingTasks, color: '#F59E0B' },
      { name: 'Overdue', value: overdueTasks, color: '#EF4444' }
    ];

    // Recent activity for this user
    const recentActivities = await TaskActivityLog.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Task, as: 'task', attributes: ['id', 'title'] }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines = tasks
      .filter((t) => {
        if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
        const diffDays = Math.ceil((new Date(t.due_date) - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      })
      .slice(0, 5);

    return res.json({
      employee: {
        id: userEmployee.id,
        name: `${userEmployee.first_name} ${userEmployee.last_name}`,
        employee_id: userEmployee.employee_id,
        designation: userEmployee.designation,
        department: userEmployee.department || 'General'
      },
      cards: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        on_hold_tasks: onHoldTasks,
        on_hold: onHoldTasks,
        not_started_tasks: notStartedTasks,
        pending_tasks: pendingTasks,
        overdue_tasks: overdueTasks,
        completion_rate: completionRate,
        monthly_total: monthlyTotal,
        monthly_completed: monthlyCompleted,
        monthly_rate: monthlyRate
      },
      charts: {
        status_distribution: statusDistribution,
        category_distribution: categoryDistribution,
        priority_distribution: priorityDistribution
      },
      upcoming_deadlines: upcomingDeadlines,
      recent_activities: recentActivities
    });
  } catch (error) {
    console.error('Employee dashboard stats error:', error);
    return res.status(500).json({ message: 'Failed to retrieve personal dashboard analytics.' });
  }
};

// DETAILED EMPLOYEE PERFORMANCE PAGE (Admin Drill-Down)
const getEmployeePerformanceDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date_filter = 'all', start_date, end_date, month } = req.query;

    const employee = await Employee.findByPk(employeeId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'is_active', 'last_login', 'created_at'] }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Role check: Only admin or the employee themselves
    if (req.user.role !== 'admin' && req.user.id !== employee.user_id) {
      return res.status(403).json({ message: 'Access denied: You cannot view this employee performance analysis.' });
    }

    // Fetch all tasks for this employee (for 6-month historical stacked trend calculation)
    const allEmployeeTasks = await Task.findAll({
      include: [
        {
          model: Employee,
          as: 'assigned_employees',
          attributes: ['id', 'first_name', 'last_name'],
          through: { attributes: [] }
        },
        {
          model: TaskCategory,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }
      ],
      order: [['due_date', 'DESC'], ['id', 'DESC']]
    });

    const employeeTasks = allEmployeeTasks.filter((t) => {
      const isAssigned = t.assigned_employees && t.assigned_employees.some((e) => e.id === employee.id);
      const isCreator = employee.user_id && t.creator_id === employee.user_id;
      return isAssigned || isCreator;
    });

    // Determine current/selected month
    const now = getNowIST();
    const todayStr = getISTDateString();
    const activeMonthStr = month || getISTMonthString();

    // Filter tasks for the selected month or date range (defaults to activeMonthStr)
    let filteredTasks = employeeTasks;
    if (month || (!date_filter || date_filter === 'all')) {
      filteredTasks = employeeTasks.filter((t) => matchesMonth(t, activeMonthStr));
    } else if (date_filter && date_filter !== 'all') {
      const { start, end } = getDateRange(date_filter, start_date, end_date);
      if (start && end) {
        const sStr = getISTDateString(start);
        const eStr = getISTDateString(end);
        filteredTasks = employeeTasks.filter((t) => t.due_date && t.due_date >= sStr && t.due_date <= eStr);
      }
    }

    const norm = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_').trim();

    const tasks = filteredTasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => norm(t.status) === 'completed');
    const inProgressTasks = tasks.filter((t) => norm(t.status) === 'in_progress');
    const onHoldTasks = tasks.filter((t) => norm(t.status) === 'on_hold' || norm(t.status) === 'hold');
    const notStartedTasks = tasks.filter((t) => norm(t.status) === 'not_started');
    const pendingTasks = tasks.filter((t) => norm(t.status) === 'not_started' || norm(t.status) === 'on_hold' || norm(t.status) === 'hold');
    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.due_date < todayStr && norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled'
    );

    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Estimated Hours vs Actual Hours
    const totalEstimated = tasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (parseFloat(t.actual_hours) || 0), 0);

    // Average task completion time in days
    let avgDays = 0;
    const completedWithDates = completedTasks.filter((t) => t.completed_date && t.start_date);
    if (completedWithDates.length > 0) {
      const sumDiffDays = completedWithDates.reduce((acc, t) => {
        const s = new Date(t.start_date);
        const c = new Date(t.completed_date);
        const diff = Math.max(1, Math.round((c - s) / (1000 * 60 * 60 * 24)));
        return acc + diff;
      }, 0);
      avgDays = (sumDiffDays / completedWithDates.length).toFixed(1);
    }

    // Monthly trends (Stacked Bar Chart: Completed, In Progress, On Hold)
    // 6-month window ending at the selected month
    const [ay, am] = activeMonthStr.split('-').map(Number);
    const activeDate = new Date(ay, am - 1, 1);
    const monthlyTrends = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(activeDate.getFullYear(), activeDate.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mName = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const mTasks = (mStr === activeMonthStr)
        ? filteredTasks
        : employeeTasks.filter((t) => matchesMonth(t, mStr));
      const mAssigned = mTasks.length;
      const mDone = mTasks.filter((t) => norm(t.status) === 'completed').length;
      const mInProgress = mTasks.filter((t) => norm(t.status) === 'in_progress').length;
      const mOnHold = mTasks.filter((t) => norm(t.status) === 'on_hold' || norm(t.status) === 'hold').length;
      const mNotStarted = mTasks.filter((t) => norm(t.status) === 'not_started').length;
      const mCancelled = mTasks.filter((t) => norm(t.status) === 'cancelled').length;
      const mOver = mTasks.filter(
        (t) => t.due_date && t.due_date < todayStr && norm(t.status) !== 'completed' && norm(t.status) !== 'cancelled'
      ).length;

      monthlyTrends.push({
        month: mName,
        monthKey: mStr,
        assigned: mAssigned,
        completed: mDone,
        in_progress: mInProgress,
        on_hold: mOnHold,
        not_started: mNotStarted,
        cancelled: mCancelled,
        overdue: mOver,
        rate: mAssigned > 0 ? Math.round((mDone / mAssigned) * 100) : 0
      });
    }

    // Weekly activity for past 4 weeks
    const weeklyActivity = [];
    for (let w = 3; w >= 0; w--) {
      const wStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w + 1) * 7);
      const wEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
      const wLabel = `Week ${4 - w}`;

      const wTasks = tasks.filter((t) => {
        const c = new Date(t.created_at);
        return c >= wStart && c <= wEnd;
      });

      const wCompleted = tasks.filter((t) => {
        if (!t.completed_date) return false;
        const comp = new Date(t.completed_date);
        return comp >= wStart && comp <= wEnd;
      });

      weeklyActivity.push({
        week: wLabel,
        created: wTasks.length,
        completed: wCompleted.length
      });
    }

    // Recent activity logs for this employee
    const activityLogs = await TaskActivityLog.findAll({
      where: { user_id: employee.user_id },
      include: [{ model: Task, as: 'task', attributes: ['id', 'title'] }],
      order: [['created_at', 'DESC']],
      limit: 15
    });

    return res.json({
      employee: {
        id: employee.id,
        user_id: employee.user_id,
        employee_id: employee.employee_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        full_name: `${employee.first_name} ${employee.last_name}`,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        joining_date: employee.joining_date,
        avatar_url: employee.avatar_url,
        bio: employee.bio,
        user: employee.user
      },
      summary: {
        total_assigned: totalTasks,
        completed: completedTasks.length,
        in_progress: inProgressTasks.length,
        on_hold: onHoldTasks.length,
        on_hold_tasks: onHoldTasks.length,
        not_started: notStartedTasks.length,
        not_started_tasks: notStartedTasks.length,
        pending: pendingTasks.length,
        pending_tasks: pendingTasks.length,
        overdue: overdueTasks.length,
        overdue_tasks: overdueTasks.length,
        completion_rate: completionRate,
        average_completion_time_days: parseFloat(avgDays),
        total_estimated_hours: totalEstimated,
        total_actual_hours: totalActual,
        efficiency_ratio: totalActual > 0 ? (totalEstimated / totalActual).toFixed(2) : 1.0
      },
      charts: {
        monthly_trends: monthlyTrends,
        weekly_activity: weeklyActivity,
        hours_comparison: [
          { name: 'Estimated Hours', hours: totalEstimated },
          { name: 'Actual Hours', hours: totalActual }
        ]
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        progress: t.progress,
        due_date: t.due_date,
        completed_date: t.completed_date,
        estimated_hours: t.estimated_hours,
        actual_hours: t.actual_hours,
        category: t.category?.name || 'General',
        is_overdue: t.due_date && t.due_date < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
      })),
      activity_logs: activityLogs
    });
  } catch (error) {
    console.error('Employee performance details error:', error);
    return res.status(500).json({ message: 'Failed to generate employee performance analytics.' });
  }
};

module.exports = {
  getAdminDashboardStats,
  getEmployeeDashboardStats,
  getEmployeePerformanceDetails
};
