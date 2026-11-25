const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticate, taskController.getAllTasks);

// Carry Forward Routes (Placed before /:id)
router.get('/carry-forward/candidates', authenticate, taskController.getCarryForwardCandidates);
router.post('/carry-forward', authenticate, taskController.carryForwardTasks);

router.get('/:id', authenticate, taskController.getTaskById);
router.post('/', authenticate, taskController.createTask);
router.put('/:id', authenticate, taskController.updateTask);
router.patch('/:id/status', authenticate, taskController.updateTaskStatus);
router.post('/:id/carry-forward', authenticate, taskController.carryForwardSingleTask);
router.post('/:id/review', authenticate, authorize('admin'), taskController.reviewTask);
router.delete('/:id', authenticate, taskController.deleteTask);

// Comments
router.post('/:id/comments', authenticate, taskController.addComment);

// Attachments
router.post('/:id/attachments', authenticate, upload.single('file'), taskController.uploadAttachment);
router.delete('/attachments/:attachmentId', authenticate, taskController.deleteAttachment);

module.exports = router;

