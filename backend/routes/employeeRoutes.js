const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, employeeController.getAllEmployees);
router.get('/:id', authenticate, employeeController.getEmployeeById);
router.post('/', authenticate, authorize('admin'), employeeController.createEmployee);
router.put('/:id', authenticate, authorize('admin'), employeeController.updateEmployee);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), employeeController.toggleEmployeeStatus);
router.delete('/:id', authenticate, authorize('admin'), employeeController.deleteEmployee);

module.exports = router;

