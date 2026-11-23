const { Op } = require('sequelize');
const { sequelize, User, Employee, Department, Task, TaskAssignment } = require('../models');
const { getISTDateString } = require('../utils/dateUtils');

// GET all employees (Admin can see all, Employee can see basic directory for assignment/mention)
const getAllEmployees = async (req, res) => {
  try {
    const { search, department, department_id, is_active, role, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const employeeWhere = {};
    const userWhere = {};

    const targetDept = department || department_id;
    if (targetDept && targetDept !== 'all') {
      employeeWhere[Op.or] = [
        { department: { [Op.iLike]: `%${String(targetDept).trim()}%` } },
        ...(Number.isInteger(parseInt(targetDept, 10)) ? [{ department_id: parseInt(targetDept, 10) }] : [])
      ];
    }

    if (is_active !== undefined) {
      userWhere.is_active = is_active === 'true';
    }

    if (role) {
      userWhere.role = role;
    }

    if (search) {
      const term = `%${search.trim()}%`;
      employeeWhere[Op.or] = [
        { first_name: { [Op.iLike]: term } },
        { last_name: { [Op.iLike]: term } },
        { employee_id: { [Op.iLike]: term } },
        { designation: { [Op.iLike]: term } },
        { department: { [Op.iLike]: term } }
      ];
    }

    const { count, rows: employees } = await Employee.findAndCountAll({
      where: employeeWhere,
      include: [
        {
          model: User,
          as: 'user',
          where: userWhere,
          attributes: ['id', 'email', 'role', 'is_active', 'last_login']
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status', 'due_date'],
          through: { attributes: [] }
        }
      ],
      order: [['first_name', 'ASC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true
    });

    const enrichedEmployees = employees.map((emp) => {
      const tasks = emp.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === 'completed').length;
      const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter((t) => t.status === 'not_started' || t.status === 'on_hold').length;
      const now = new Date();
      const overdueTasks = tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed' && t.status !== 'cancelled'
      ).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: emp.id,
        user_id: emp.user_id,
        employee_id: emp.employee_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        phone: emp.phone,
        designation: emp.designation,
        department: emp.department,
        joining_date: emp.joining_date,
        avatar_url: emp.avatar_url,
        address: emp.address,
        bio: emp.bio,
        user: emp.user,
        stats: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          in_progress_tasks: inProgressTasks,
          pending_tasks: pendingTasks,
          overdue_tasks: overdueTasks,
          completion_rate: completionRate
        }
      };
    });

    return res.json({
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      employees: enrichedEmployees
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    return res.status(500).json({ message: 'Failed to retrieve employees list.' });
  }
};

// GET single employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const emp = await Employee.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'is_active', 'last_login', 'created_at']
        },
        {
          model: Task,
          as: 'tasks',
          include: ['category'],
          through: { attributes: [] }
        }
      ]
    });

    if (!emp) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Role verification: an employee can only view their own details unless user is admin
    if (req.user.role !== 'admin' && req.user.id !== emp.user_id) {
      return res.status(403).json({ message: 'Access denied to this employee profile.' });
    }

    const tasks = emp.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const pendingTasks = tasks.filter((t) => t.status === 'not_started' || t.status === 'on_hold').length;
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (parseFloat(t.actual_hours) || 0), 0);

    return res.json({
      employee: {
        id: emp.id,
        user_id: emp.user_id,
        employee_id: emp.employee_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        phone: emp.phone,
        designation: emp.designation,
        department: emp.department,
        joining_date: emp.joining_date,
        avatar_url: emp.avatar_url,
        address: emp.address,
        bio: emp.bio,
        user: emp.user,
        tasks: emp.tasks,
        stats: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          in_progress_tasks: inProgressTasks,
          pending_tasks: pendingTasks,
          overdue_tasks: overdueTasks,
          completion_rate: completionRate,
          total_estimated_hours: totalEstimatedHours,
          total_actual_hours: totalActualHours
        }
      }
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    return res.status(500).json({ message: 'Failed to retrieve employee details.' });
  }
};

// CREATE new employee (Admin only)
const createEmployee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      email,
      password,
      role = 'employee',
      employee_id,
      first_name,
      last_name,
      phone,
      designation,
      department,
      department_id,
      joining_date,
      bio,
      address
    } = req.body;

    if (!email || !password || !first_name || !last_name || !designation) {
      await t.rollback();
      return res.status(400).json({
        message: 'Required fields missing: email, password, first_name, last_name, and designation are mandatory.'
      });
    }

    // Check existing account with the same email and role
    const targetRole = role === 'admin' ? 'admin' : 'employee';
    const existingUser = await User.findOne({ where: { email: email.trim().toLowerCase(), role: targetRole }, transaction: t });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ message: `An account with this email address already exists as ${targetRole}.` });
    }

    // Generate or check employee_id
    let finalEmpId = employee_id ? employee_id.trim() : null;
    if (!finalEmpId) {
      const highestEmp = await Employee.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });
      const nextNum = highestEmp ? highestEmp.id + 1001 : 1001;
      const prefix = targetRole === 'admin' ? 'ADM' : 'EMP';
      finalEmpId = `${prefix}-${nextNum}`;
    } else {
      const existingEmp = await Employee.findOne({ where: { employee_id: finalEmpId }, transaction: t });
      if (existingEmp) {
        await t.rollback();
        return res.status(400).json({ message: 'An employee with this Employee ID already exists.' });
      }
    }

    const user = await User.create(
      {
        email: email.trim().toLowerCase(),
        password,
        role: role === 'admin' ? 'admin' : 'employee',
        is_active: true
      },
      { transaction: t }
    );

    // Resolve department text
    let deptText = department ? department.trim() : null;
    if (!deptText && department_id) {
      const dRec = await Department.findByPk(department_id, { transaction: t });
      if (dRec) deptText = dRec.name;
    }
    if (!deptText) deptText = 'General';

    const employee = await Employee.create(
      {
        user_id: user.id,
        employee_id: finalEmpId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone ? phone.trim() : null,
        designation: designation.trim(),
        department: deptText,
        department_id: department_id ? parseInt(department_id, 10) : null,
        joining_date: joining_date || getISTDateString(),
        bio: bio ? bio.trim() : null,
        address: address ? address.trim() : null
      },
      { transaction: t }
    );

    await t.commit();

    const result = await Employee.findByPk(employee.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'role', 'is_active', 'last_login'] }
      ]
    });

    return res.status(201).json({
      message: 'Employee created successfully.',
      employee: result
    });
  } catch (error) {
    await t.rollback();
    console.error('Create employee error:', error);
    return res.status(500).json({ message: 'Failed to create employee record: ' + error.message });
  }
};

// UPDATE employee (Admin only)
const updateEmployee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      designation,
      department,
      department_id,
      joining_date,
      bio,
      address,
      role,
      is_active,
      password
    } = req.body;

    const employee = await Employee.findByPk(id, { transaction: t });
    if (!employee) {
      await t.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const user = await User.findByPk(employee.user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (first_name) employee.first_name = first_name.trim();
    if (last_name) employee.last_name = last_name.trim();
    if (phone !== undefined) employee.phone = phone ? phone.trim() : null;
    if (designation) employee.designation = designation.trim();
    if (department !== undefined) {
      employee.department = department ? department.trim() : 'General';
    } else if (department_id !== undefined) {
      employee.department_id = department_id ? parseInt(department_id, 10) : null;
    }
    if (joining_date) employee.joining_date = joining_date;
    if (bio !== undefined) employee.bio = bio ? bio.trim() : null;
    if (address !== undefined) employee.address = address ? address.trim() : null;

    await employee.save({ transaction: t });

    if (role && (role === 'admin' || role === 'employee')) {
      user.role = role;
    }
    if (is_active !== undefined) {
      user.is_active = Boolean(is_active);
    }
    if (password && password.length >= 8) {
      user.password = password; // triggers hash hook
    }

    await user.save({ transaction: t });
    await t.commit();

    const updated = await Employee.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'role', 'is_active', 'last_login'] }
      ]
    });

    return res.json({
      message: 'Employee updated successfully.',
      employee: updated
    });
  } catch (error) {
    await t.rollback();
    console.error('Update employee error:', error);
    return res.status(500).json({ message: 'Failed to update employee.' });
  }
};

// TOGGLE active status (Admin only)
const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const user = await User.findByPk(employee.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.is_active = !user.is_active;
    await user.save();

    return res.json({
      message: `Employee account has been ${user.is_active ? 'activated' : 'deactivated'}.`,
      is_active: user.is_active
    });
  } catch (error) {
    console.error('Toggle employee status error:', error);
    return res.status(500).json({ message: 'Failed to toggle employee status.' });
  }
};

// DELETE employee (Admin only)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Cascade delete user deletes employee
    await User.destroy({ where: { id: employee.user_id } });

    return res.json({ message: 'Employee deleted successfully.' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({ message: 'Failed to delete employee.' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee
};

