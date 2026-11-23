const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/taskCategoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, categoryController.getAllCategories);
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);

module.exports = router;

