const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/excel', authenticate, authorize('admin'), reportController.exportExcelReport);
router.get('/pdf', authenticate, authorize('admin'), reportController.exportPdfReport);

module.exports = router;

