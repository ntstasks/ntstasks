const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

// Public list of departments for employee registration and task assignment
router.get('/', departmentController.getAllDepartments);
router.post('/', authenticate, authorize('admin'), departmentController.createDepartment);
router.put('/:id', authenticate, authorize('admin'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('admin'), departmentController.deleteDepartment);

module.exports = router;

