import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskApi, employeeApi } from '../services/api';
import { getStatusBadge, getPriorityBadge } from '../utils/statusBadges';
import TaskModal from '../components/tasks/TaskModal';
import CarryForwardModal from '../components/tasks/CarryForwardModal';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Target,
  Sparkles,
  Calendar,
  FastForward,
  ArrowRightCircle,
  Users,
  Edit
} from 'lucide-react';

const MonthlyPlanner = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const initialMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(initialMonthStr);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carryForwardCount, setCarryForwardCount] = useState(0);

  // Employee-wise filtering state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');

  // Modals & Carry Forward State
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState(null);
  const [carryingForwardId, setCarryingForwardId] = useState(null);

  const handleOpenEditTask = (task) => {
    if (isAdmin) return; // Admin is view-only; cannot edit employee tasks
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  // Fetch employees list for Admin
  useEffect(() => {
    if (isAdmin) {
      employeeApi.getEmployees({ is_active: 'true' })
        .then((res) => setEmployees(res.data.employees || []))
        .catch((err) => console.error('Failed to load employees for filter:', err));
    }
  }, [isAdmin]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const newMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const newMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  const fetchMonthlyTasks = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        limit: 100
      };
      if (isAdmin && selectedEmployeeId !== 'all') {
        params.employee_id = selectedEmployeeId;
      }
      const res = await taskApi.getTasks(params);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load monthly tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkCarryForwardCandidates = async () => {
    try {
      const res = await taskApi.getCarryForwardCandidates({
        target_month: selectedMonth
      });
      setCarryForwardCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to check carry forward candidates:', err);
    }
  };

  const refreshAll = () => {
    fetchMonthlyTasks();
    checkCarryForwardCandidates();
  };

  useEffect(() => {
    refreshAll();
  }, [selectedMonth, selectedEmployeeId]);

  useEffect(() => {
    const handleTaskSaved = () => {
      refreshAll();
    };
    window.addEventListener('nts:task-saved', handleTaskSaved);
    return () => window.removeEventListener('nts:task-saved', handleTaskSaved);
  }, [selectedMonth, selectedEmployeeId]);

  // Statistics calculation (accounting for all statuses independently)
  const normStatus = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => normStatus(t.status) === 'completed').length;
  const inProgressTasks = tasks.filter((t) => normStatus(t.status) === 'in_progress').length;
  const onHoldTasks = tasks.filter((t) => normStatus(t.status) === 'on_hold' || normStatus(t.status) === 'hold').length;
  const notStartedTasks = tasks.filter((t) => normStatus(t.status) === 'not_started').length;
  const cancelledTasks = tasks.filter((t) => normStatus(t.status) === 'cancelled').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Month Display Name
  const [y, m] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(y, m - 1, 1);
  const monthLabel = monthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Compute previous month label for context
  const prevDate = new Date(y, m - 2, 1);
  const prevMonthLabel = prevDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Compute next calendar month automatically for carry forward
  const nextMonthDate = new Date(y, m, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthLabel = nextMonthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Carry Forward handlers
  const handleCarryForwardTask = (task) => {
    if (task.status === 'completed' || task.status === 'cancelled') {
      error('Completed or cancelled tasks cannot be carried forward.');
      return;
    }
    if (!isAdmin && user?.employee) {
      const isAssigned = task.assigned_employees?.some((e) => e.id === user.employee.id);
      const isCreator = task.creator_id === user.id;
      if (!isAssigned && !isCreator) {
        error('You can only carry forward tasks assigned to you.');
        return;
      }
    }
    setConfirmTask(task);
  };

  const executeCarryForward = async () => {
    if (!confirmTask) return;
    setCarryingForwardId(confirmTask.id);
    try {
      await taskApi.carryForwardSingleTask(confirmTask.id, {
        target_month: nextMonthStr
      });
      success(`Task "${confirmTask.title}" carried forward to ${nextMonthLabel}.`);
      setConfirmTask(null);
      refreshAll();
    } catch (err) {
      console.error('Carry forward error:', err);
      error(err.response?.data?.message || 'Failed to carry forward task.');
    } finally {
      setCarryingForwardId(null);
    }
  };

  // Selected employee metadata for Admin filtering
  const selectedEmp = employees.find((e) => String(e.id) === String(selectedEmployeeId));
  const selectedEmpName = selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : 'Selected employee';

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header with Month Navigation */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-black dark:text-white stroke-[2.2]" />
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">Monthly Task Planning</h2>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-400 font-bold">
            Plan, compare targets vs completed assignments, and roll forward incomplete work seamlessly.
          </p>
        </div>

        {/* Month Selector Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Employee-Wise Filter for Admin */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 shadow-inner">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <label htmlFor="admin-emp-filter" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Employee:
              </label>
              <select
                id="admin-emp-filter"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[180px] sm:max-w-xs truncate"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}{emp.designation ? ` (${emp.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add Task Button (Employees only - left side of calendar) */}
          {!isAdmin && (
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0"
              title="Add New Task"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carry Forward Banner if unfinished tasks exist in previous month (Employees only) */}
      {!isAdmin && carryForwardCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FastForward className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-black text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
                <span>Carry Forward Unfinished Tasks</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-black">
                  {carryForwardCount} Pending
                </span>
              </h4>
              <p className="text-amber-900 dark:text-amber-300/90 text-xs mt-0.5 font-medium">
                You have {carryForwardCount} incomplete assignment{carryForwardCount > 1 ? 's' : ''} from {prevMonthLabel}. Carry them forward into {monthLabel} to maintain work continuity.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCarryForwardOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95"
          >
            <ArrowRightCircle className="w-4 h-4" />
            <span>Review & Carry Forward</span>
          </button>
        </div>
      )}

      {/* Monthly Overview Progress Banner */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Monthly Progress Status &bull; {monthLabel}
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
              {completedTasks} of {totalTasks} Tasks Completed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {totalTasks - completedTasks} assignments remaining this month
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight block">
              {completionRate}%
            </span>
            <span className="text-[11px] text-slate-400 block font-medium">Completion Rate</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* KPI Cards for Selected Month (Reconciling all task statuses with separate On Hold) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Planned
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">All scheduled tasks</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Completed
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Deliverables achieved</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            In Progress
          </span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{inProgressTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Under active work</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            On Hold
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{onHoldTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Paused or waiting</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Not Started
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {notStartedTasks + cancelledTasks}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {cancelledTasks > 0 ? `${notStartedTasks} pending, ${cancelledTasks} cancelled` : 'Pending start'}
          </p>
        </div>
      </div>

      {/* Monthly Tasks List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tasks Scheduled for {monthLabel}
              {isAdmin && selectedEmployeeId !== 'all' && selectedEmp ? ` • ${selectedEmpName}` : ''} ({tasks.length})
            </h3>
            <p className="text-xs text-slate-400">
              {isAdmin ? 'Review deliverables and monitor ongoing employee assignments' : 'Review deliverables, edit tasks, or carry forward ongoing work'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs animate-pulse">
            Loading monthly schedule...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isAdmin && selectedEmployeeId !== 'all'
                ? `No tasks planned for ${selectedEmpName} in ${monthLabel}.`
                : `No tasks planned for ${monthLabel} yet.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {isAdmin && selectedEmployeeId !== 'all' && (
                <button
                  onClick={() => setSelectedEmployeeId('all')}
                  className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Show All Employees</span>
                </button>
              )}
              {!isAdmin && carryForwardCount > 0 && (
                <button
                  onClick={() => setIsCarryForwardOpen(true)}
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Carry Forward {carryForwardCount} from Last Month</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Mobile Task Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => !isAdmin && handleOpenEditTask(t)}
                  className={`p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isAdmin ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400">
                        #{String(t.id).padStart(4, '0')}
                      </span>
                      {t.is_overdue && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          OVERDUE
                        </span>
                      )}
                      {getPriorityBadge(t.priority)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(t.status)}
                      {!isAdmin && t.status !== 'completed' && t.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCarryForwardTask(t);
                          }}
                          disabled={carryingForwardId === t.id}
                          className="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 font-semibold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer border border-amber-200/60"
                          title={`Carry forward to next month (${nextMonthLabel})`}
                        >
                          <FastForward className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Carry Forward</span>
                        </button>
                      )}
                      {!isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTask(t);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-semibold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Edit task"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {t.title}
                  </h4>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dept: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{t.department?.name || t.category?.name || 'General'}</strong>
                    </span>
                    <span className={`text-[11px] font-semibold ${t.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      Due: {t.due_date || 'N/A'}
                    </span>
                  </div>

                  {/* Assignee */}
                  <div className="pt-1 text-[11px] text-slate-400">
                    Assignee: <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-950/60">
                    <th className="py-3 px-4 rounded-l-xl">Task Title</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Assignee(s)</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className={`py-3 px-3 ${isAdmin ? 'rounded-r-xl' : ''}`}>Deadline</th>
                    {!isAdmin && <th className="py-3 px-4 text-right rounded-r-xl">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {tasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => !isAdmin && handleOpenEditTask(t)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isAdmin ? 'cursor-pointer group' : ''}`}
                    >
                      <td className={`py-3.5 px-4 font-semibold text-slate-900 dark:text-white ${!isAdmin ? 'group-hover:text-brand-600' : ''} transition-colors`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            #{String(t.id).padStart(4, '0')}
                          </span>
                          {t.is_overdue && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{t.title}</p>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">{t.department?.name || t.category?.name || 'General'}</td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        {t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-3">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3.5 px-3">{getStatusBadge(t.status)}</td>
                      <td className={`py-3.5 px-3 font-medium ${t.is_overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {t.due_date || 'N/A'}
                      </td>
                      {!isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status !== 'completed' && t.status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCarryForwardTask(t);
                                }}
                                disabled={carryingForwardId === t.id}
                                className="py-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-amber-200/60 shadow-2xs"
                                title={`Carry forward to next month (${nextMonthLabel})`}
                              >
                                <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Carry Forward</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTask(t);
                              }}
                              className="py-1.5 px-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Edit this task"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Carrying Forward a Single Task */}
      {confirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <FastForward className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Carry Forward Task</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Move task to the next calendar month</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to carry forward <strong className="text-black dark:text-white">"{confirmTask.title}"</strong> to <strong className="text-amber-600 dark:text-amber-400">{nextMonthLabel}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTask(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCarryForward}
                disabled={carryingForwardId === confirmTask.id}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{carryingForwardId === confirmTask.id ? 'Moving...' : 'Yes, Carry Forward'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal for Creating or Editing Tasks */}
      <TaskModal
        isOpen={isTaskModalOpen}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskSaved={() => refreshAll()}
      />

      <CarryForwardModal
        isOpen={isCarryForwardOpen}
        targetMonth={selectedMonth}
        onClose={() => setIsCarryForwardOpen(false)}
        onSuccess={() => refreshAll()}
      />
    </div>
  );
};

export default MonthlyPlanner;
