import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { taskApi, employeeApi, departmentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { X, Calendar, Clock, AlertCircle, Check } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, taskToEdit, onTaskSaved }) => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  // Lock background scroll whenever this modal is open
  useBodyScrollLock(isOpen);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('not_started');
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isMonthlyPlanned, setIsMonthlyPlanned] = useState(true);
  const [plannedMonth, setPlannedMonth] = useState('');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch departments and employees (fetch other employees list ONLY if admin)
  useEffect(() => {
    if (isOpen) {
      departmentApi.getDepartments().then((res) => setDepartments(res.data.departments || []));
      if (isAdmin) {
        employeeApi.getEmployees({ is_active: 'true' }).then((res) => setEmployees(res.data.employees || []));
      }
    }
  }, [isOpen, isAdmin]);

  // Reset or populate fields
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setDepartmentId(taskToEdit.department_id || taskToEdit.department?.id || '');
      setPriority(taskToEdit.priority || 'medium');
      setStatus(taskToEdit.status || 'not_started');
      setProgress(taskToEdit.progress || 0);
      setStartDate(taskToEdit.start_date || '');
      setDueDate(taskToEdit.due_date || '');
      setIsMonthlyPlanned(taskToEdit.is_monthly_planned !== undefined ? taskToEdit.is_monthly_planned : true);
      setPlannedMonth(taskToEdit.planned_month || '');
      setAssignedEmployeeIds(taskToEdit.assigned_employees?.map((e) => e.id) || []);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStr = todayStr.substring(0, 7);
      setTitle('');
      setDescription('');
      setDepartmentId(user?.employee?.department_id ? String(user.employee.department_id) : (departments[0]?.id ? String(departments[0].id) : ''));
      setPriority('medium');
      setStatus('not_started');
      setProgress(0);
      setStartDate(todayStr);
      setDueDate('');
      setIsMonthlyPlanned(true);
      setPlannedMonth(monthStr);
      if (user?.employee) {
        setAssignedEmployeeIds([user.employee.id]);
      } else {
        setAssignedEmployeeIds([]);
      }
    }
  }, [taskToEdit, isOpen, departments, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      error('Task title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        department_id: departmentId ? parseInt(departmentId, 10) : null,
        priority,
        status,
        progress: taskToEdit ? (parseInt(progress, 10) || 0) : (status === 'completed' ? 100 : 0),
        start_date: startDate || null,
        due_date: dueDate || null,
        estimated_hours: taskToEdit?.estimated_hours ? parseFloat(taskToEdit.estimated_hours) : 0,
        actual_hours: taskToEdit?.actual_hours ? parseFloat(taskToEdit.actual_hours) : 0,
        is_monthly_planned: isMonthlyPlanned,
        planned_month: plannedMonth || (dueDate ? dueDate.substring(0, 7) : null),
        assigned_employee_ids: !isAdmin && user?.employee ? [user.employee.id] : assignedEmployeeIds
      };

      if (taskToEdit) {
        await taskApi.updateTask(taskToEdit.id, payload);
        success('Task updated successfully.');
      } else {
        await taskApi.createTask(payload);
        success('Task created successfully.');
      }

      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setAssignedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden overscroll-contain animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
        {/* Modal Header (Fixed / Sticky) */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {taskToEdit ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              {taskToEdit ? 'Update details, progress and assignment' : 'Add assignment to your work schedule'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body (Scrollable with min-h-0 for 14" screen visibility) */}
        <form
          id="task-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs slick-scrollbar"
        >
          {/* Task Title */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Responsive Analytics Charts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description & Objectives
            </label>
            <textarea
              rows={2}
              placeholder="Detailed explanation of requirements, deliverables and acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Department & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
            </div>
          </div>

          {/* Status & Progress (Progress slider removed for Create New Task) */}
          <div className={taskToEdit ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" : "block"}>
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  if (e.target.value === 'completed') setProgress(100);
                  else if (e.target.value === 'not_started') setProgress(0);
                }}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {taskToEdit && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Progress Percentage
                  </label>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setProgress(val);
                    if (val === 100 && status !== 'completed') setStatus('completed');
                    if (val < 100 && status === 'completed') setStatus('in_progress');
                  }}
                  className="w-full accent-brand-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Due Date / Deadline
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setDueDate(val);
                  if (val) {
                    setPlannedMonth(val.substring(0, 7));
                  }
                }}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Monthly Planning */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Include in Monthly Planner</span>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">Track in organizational monthly progress and reports</p>
              </div>
              <input
                type="checkbox"
                checked={isMonthlyPlanned}
                onChange={(e) => setIsMonthlyPlanned(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>

            {isMonthlyPlanned && (
              <div className="pt-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={plannedMonth}
                  onChange={(e) => setPlannedMonth(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            )}
          </div>

          {/* Assign Task To: Admin assigns to any member, Employee assigns strictly to themselves */}
          {isAdmin ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assign Task To ({assignedEmployeeIds.length} selected)
                </label>
                <span className="text-[10px] text-slate-400">Admins & Team Members</span>
              </div>
              <div className="max-h-36 sm:max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/40 slick-scrollbar">
                {employees.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">No team members found</div>
                ) : (
                  employees.map((emp) => {
                    const isChecked = assignedEmployeeIds.includes(emp.id);
                    const isEmpAdmin = emp.user?.role === 'admin';
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleEmployeeSelection(emp.id)}
                        className="py-1.5 px-2 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div
                            className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                              isEmpAdmin
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                            }`}
                          >
                            {emp.first_name.charAt(0)}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap truncate">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {emp.first_name} {emp.last_name}
                            </span>
                            {isEmpAdmin ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Admin
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                ({emp.designation || 'Employee'})
                              </span>
                            )}
                            {emp.department && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                &bull; {emp.department.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.employee?.first_name ? user.employee.first_name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : user?.email}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      You
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {user?.employee?.designation || 'Employee'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3 stroke-[2.5]" />
                Assigned to your schedule
              </span>
            </div>
          )}
        </form>

        {/* Modal Actions Footer (Fixed / Sticky - Always Visible on 14" screens) */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 bg-slate-50/90 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-modal-form"
            disabled={submitting}
            className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {submitting ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskModal;
