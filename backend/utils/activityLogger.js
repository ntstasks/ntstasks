const { TaskActivityLog } = require('../models');

/**
 * Records an activity for a task.
 * @param {Object} params
 * @param {number} params.taskId - ID of the task
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.action - Action type (e.g., 'created', 'status_changed', 'progress_updated', 'commented')
 * @param {any} [params.previousValue] - Previous state
 * @param {any} [params.newValue] - New state
 * @param {string} [params.details] - Human-readable explanation
 */
async function logTaskActivity({ taskId, userId, action, previousValue = null, newValue = null, details = '' }) {
  try {
    await TaskActivityLog.create({
      task_id: taskId,
      user_id: userId,
      action,
      previous_value: previousValue !== null ? (typeof previousValue === 'object' ? JSON.stringify(previousValue) : String(previousValue)) : null,
      new_value: newValue !== null ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : null,
      details
    });
  } catch (error) {
    console.error('Failed to log task activity:', error.message);
  }
}

module.exports = { logTaskActivity };

