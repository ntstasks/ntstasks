const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/admin-dashboard', authenticate, authorize('admin'), analyticsController.getAdminDashboardStats);
router.get('/employee-dashboard', authenticate, analyticsController.getEmployeeDashboardStats);
router.get('/employee-performance/:employeeId', authenticate, analyticsController.getEmployeePerformanceDetails);

module.exports = router;

