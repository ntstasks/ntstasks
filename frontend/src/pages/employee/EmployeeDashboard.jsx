import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { analyticsApi, taskApi } from '../../services/api';
import { getStatusBadge, getPriorityBadge } from '../../utils/statusBadges';
import TaskModal from '../../components/tasks/TaskModal';
import CarryForwardModal from '../../components/tasks/CarryForwardModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import {
  CheckSquare,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Calendar,
  Plus,
  ChevronRight,
  Target,
  FastForward,
  ArrowRightCircle,
  Edit,
  Trash2
} from 'lucide-react';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carryForwardCount, setCarryForwardCount] = useState(0);

  // Modals
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);

  const handleOpenCreateTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const handleOpenEditTask = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleRequestDelete = (task, e) => {
    if (e) e.stopPropagation();
    setTaskToDelete(task);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);
    let deletedSuccessfully = false;
    try {
      await taskApi.deleteTask(taskToDelete.id);
      deletedSuccessfully = true;
      success('Task deleted successfully.');
      setTaskToDelete(null);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeletingTask(false);
    }

    if (deletedSuccessfully) {
      try {
        refreshAll();
      } catch (refreshErr) {
        console.error('Error refreshing dashboard after deletion:', refreshErr);
      }
    }
  };

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getEmployeeDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkCarryForward = async () => {
    try {
      const res = await taskApi.getCarryForwardCandidates({
        target_month: currentMonthStr
      });
      setCarryForwardCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to check carry forward candidates:', err);
    }
  };

  const refreshAll = () => {
    fetchDashboardData();
    checkCarryForward();
  };

  useEffect(() => {
    refreshAll();
    const handleTaskSaved = () => refreshAll();
    window.addEventListener('nts:task-saved', handleTaskSaved);
    return () => window.removeEventListener('nts:task-saved', handleTaskSaved);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const { employee, cards, upcoming_deadlines } = data;

  const kpiCards = [
    {
      title: 'Assigned Tasks',
      value: cards.total_tasks,
      sub: `${cards.in_progress_tasks} in progress`,
      icon: CheckSquare,
      color: 'text-brand-600 dark:text-brand-400',
      bgColor: 'bg-brand-50 dark:bg-brand-950/50'
    },
    {
      title: 'Completed Tasks',
      value: cards.completed_tasks,
      sub: `${cards.completion_rate}% completion rate`,
      icon: CheckSquare,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50'
    },
    {
      title: 'In Progress Tasks',
      value: cards.in_progress_tasks,
      sub: 'Currently working on',
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50'
    },
    {
      title: 'On Hold Tasks',
      value: cards.on_hold_tasks ?? cards.on_hold ?? (cards.pending_tasks !== undefined && cards.not_started_tasks !== undefined ? (cards.pending_tasks - cards.not_started_tasks) : 0) ?? 0,
      sub: 'Waiting or paused',
      icon: PauseCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
            Welcome, {employee.name}
          </h2>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-400">
            {employee.designation} &bull; {employee.department}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {carryForwardCount > 0 && (
            <button
              onClick={() => setIsCarryForwardOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
              title="Carry forward unfinished tasks from last month"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Carry Forward ({carryForwardCount})</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateTask}
            className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Carry Forward Alert Banner */}
      {carryForwardCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FastForward className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-black text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                You have {carryForwardCount} unfinished assignment{carryForwardCount > 1 ? 's' : ''} from last month
              </h4>
              <p className="text-amber-800 dark:text-amber-300/80 text-[11px] mt-0.5">
                Carry them forward into your current month schedule to keep your targets and progress aligned.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCarryForwardOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRightCircle className="w-4 h-4" />
            <span>Carry Forward Now</span>
          </button>
        </div>
      )}

      {/* 4 Clean Summary Cards with Responsive Scaling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {kpiCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors"
            >
              <div>
                <span className="text-[11px] font-black text-black dark:text-slate-400 uppercase tracking-wider block">
                  {c.title}
                </span>
                <span className="text-3xl font-black text-black dark:text-white mt-1 block leading-tight">
                  {c.value}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 mt-1 block">{c.sub}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${c.bgColor} ${c.color} shrink-0`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Target Progress Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-600 dark:text-brand-400 stroke-[2.2]" />
            <span className="font-black text-black dark:text-white text-sm">
              Current Month Target ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
            </span>
          </div>
          <span className="text-black dark:text-white font-extrabold text-xs">
            {cards.monthly_completed} of {cards.monthly_total} tasks completed ({cards.monthly_rate}%)
          </span>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${cards.monthly_rate}%` }}
          />
        </div>
      </div>

      {/* Upcoming Deadlines & Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines list */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
              Upcoming Deadlines (Next 7 Days)
            </h3>
          </div>

          <div className="space-y-2 pt-1">
            {upcoming_deadlines.length === 0 ? (
              <p className="py-6 text-center text-xs text-black dark:text-slate-400 font-semibold">
                No immediate deadlines in the next 7 days.
              </p>
            ) : (
              upcoming_deadlines.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleOpenEditTask(t)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-black dark:text-white truncate group-hover:text-brand-600 transition-colors">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getPriorityBadge(t.priority)}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Due: {t.due_date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditTask(t);
                      }}
                      className="p-1 px-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      title="Edit task"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => handleRequestDelete(t, e)}
                      className="p-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links / Tasks summary (Side by Side layout) */}
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 h-full">
            {/* Left side: Header, Description & Action Button */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider mb-1">
                  Task Workload
                </h3>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-400 leading-relaxed">
                  Manage your daily work assignments, update progress, or log completion.
                </p>
              </div>

              <button
                onClick={() => navigate('/monthly-planner')}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-black dark:text-white font-bold text-xs inline-flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Target className="w-4 h-4 stroke-[2.2] text-brand-600 dark:text-brand-400" />
                <span>Open Monthly Task Planner</span>
              </button>
            </div>

            {/* Right side: Priority Breakdown */}
            <div className="w-full sm:w-auto sm:min-w-[220px] md:min-w-[260px] space-y-2 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Workload by Priority
              </span>
              <div className="flex flex-col gap-2">
                {data.charts?.priority_distribution?.length > 0 ? (
                  data.charts.priority_distribution.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color || '#3B82F6' }}
                        />
                        {p.name} Priority
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                        {p.value}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">General Tasks</span>
                    <span className="text-xs font-black text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/60">
                      {cards.total_tasks || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Carry Forward Modal */}
      <CarryForwardModal
        isOpen={isCarryForwardOpen}
        targetMonth={currentMonthStr}
        onClose={() => setIsCarryForwardOpen(false)}
        onSuccess={() => refreshAll()}
      />

      {/* Modern Confirmation Modal for Delete Task */}
      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        taskTitle={taskToDelete?.title}
        taskId={taskToDelete?.id}
        loading={deletingTask}
      />
    </div>
  );
};

export default EmployeeDashboard;
