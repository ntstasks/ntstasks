const { TaskCategory } = require('../models');

const getAllCategories = async (req, res) => {
  try {
    const categories = await TaskCategory.findAll({ order: [['name', 'ASC']] });
    return res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ message: 'Failed to retrieve categories.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, color = '#3B82F6' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const existing = await TaskCategory.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ message: 'A category with this name already exists.' });
    }

    const category = await TaskCategory.create({
      name: name.trim(),
      color: color.trim()
    });

    return res.status(201).json({ message: 'Category created successfully.', category });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ message: 'Failed to create category.' });
  }
};

module.exports = {
  getAllCategories,
  createCategory
};

