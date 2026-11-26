const { Department, Employee, Task, TaskAssignment, User } = require('../models');

const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'first_name', 'last_name', 'designation', 'avatar_url'],
          include: [
            {
              model: User,
              as: 'user',
              where: { role: 'employee' },
              attributes: ['id', 'role']
            },
            {
              model: Task,
              as: 'tasks',
              attributes: ['id', 'status'],
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    const enriched = departments.map((dept) => {
      const emps = dept.employees || [];
      const totalEmployees = emps.length;
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;

      emps.forEach((emp) => {
        const tasks = emp.tasks || [];
        totalTasks += tasks.length;
        completedTasks += tasks.filter((t) => t.status === 'completed').length;
        pendingTasks += tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
      });

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        total_employees: totalEmployees,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        completion_rate: completionRate,
        employees: emps.map((e) => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          designation: e.designation,
          avatar_url: e.avatar_url
        }))
      };
    });

    return res.json({ departments: enriched });
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({ message: 'Failed to retrieve departments.' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required.' });
    }

    const existing = await Department.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ message: 'A department with this name already exists.' });
    }

    const dept = await Department.create({
      name: name.trim(),
      description: description ? description.trim() : null
    });

    return res.status(201).json({ message: 'Department created successfully.', department: dept });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ message: 'Failed to create department.' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    if (name) {
      const existing = await Department.findOne({ where: { name: name.trim() } });
      if (existing && existing.id !== dept.id) {
        return res.status(400).json({ message: 'Another department already has this name.' });
      }
      dept.name = name.trim();
    }

    if (description !== undefined) {
      dept.description = description ? description.trim() : null;
    }

    await dept.save();

    return res.json({ message: 'Department updated successfully.', department: dept });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ message: 'Failed to update department.' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Set department_id to NULL on assigned employees
    await Employee.update({ department_id: null }, { where: { department_id: id } });
    await dept.destroy();

    return res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ message: 'Failed to delete department.' });
  }
};

module.exports = {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};

