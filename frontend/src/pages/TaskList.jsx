import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskApi, employeeApi, departmentApi } from '../services/api';
import { getStatusBadge, getPriorityBadge, getApprovalBadge } from '../utils/statusBadges';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import TaskModal from '../components/tasks/TaskModal';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Trash2,
  Edit,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  FastForward
} from 'lucide-react';

const TaskList = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'));

  // Lookups
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Load Lookups for all authenticated users
  useEffect(() => {
    departmentApi.getDepartments().then((res) => setDepartments(res.data.departments || []));
    employeeApi.getEmployees({ is_active: 'true' }).then((res) => setEmployees(res.data.employees || []));
  }, []);

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (search) params.search = search;
      if (status !== 'all') params.status = status;
      if (priority !== 'all') params.priority = priority;
      if (departmentId !== 'all') params.department_id = departmentId;
      if (employeeId !== 'all') params.employee_id = employeeId;

      const res = await taskApi.getTasks(params);
      setTasks(res.data.tasks || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      error('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, status, priority, departmentId, employeeId, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      success(`Status changed to ${newStatus}.`);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : t.progress } : t))
      );
    } catch (err) {
      error('Failed to update status.');
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskApi.deleteTask(taskId);
      success('Task deleted successfully.');
      fetchTasks();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-black dark:text-white tracking-tight">
            {isAdmin ? 'All Organizational Tasks' : 'My Work Assignments'}
          </h2>
          <p className="text-xs text-slate-800 dark:text-slate-400 font-bold mt-0.5">
            Showing {tasks.length} of {total} tasks matching current filters
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* View mode toggle */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800 text-black dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-500 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Clear */}
          {(search || status !== 'all' || priority !== 'all' || departmentId !== 'all' || employeeId !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('all');
                setPriority('all');
                setDepartmentId('all');
                setEmployeeId('all');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical</option>
          </select>

          {/* Department Filter (Admin-configured Departments) */}
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Assignees Filter (Admins & Employees) */}
          <select
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Assignees (Admins & Team Members)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} {emp.user?.role === 'admin' ? '[Admin]' : ''}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none text-slate-700"
            >
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="progress">Progress %</option>
              <option value="created_at">Created Date</option>
              <option value="title">Title</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs animate-pulse">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new assignment.
          </p>
          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="py-2 px-4 rounded-xl bg-brand-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Mobile Cards on small screens, Full Table on desktop) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors w-full max-w-full">
          {/* Mobile Task Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTaskId(t.id)}
                className="p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-400">
                      #{String(t.id).padStart(4, '0')}
                    </span>
                    {t.is_overdue && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        OVERDUE
                      </span>
                    )}
                    {t.is_deadline_approaching && !t.is_overdue && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        SOON
                      </span>
                    )}
                    {getPriorityBadge(t.priority)}
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {t.title}
                </h4>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.department?.name || t.category?.name || 'General'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{t.due_date || 'No due date'}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span>Progress</span>
                    <span>{t.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        t.progress === 100
                          ? 'bg-emerald-500'
                          : t.is_overdue
                          ? 'bg-rose-500'
                          : 'bg-brand-500'
                      }`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-800 text-xs font-black text-black dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800">
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assignees</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Task Title & Code */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">
                          #{String(t.id).padStart(4, '0')}
                        </span>
                        {t.is_overdue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            OVERDUE
                          </span>
                        )}
                        {t.is_deadline_approaching && !t.is_overdue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            SOON
                          </span>
                        )}
                      </div>
                      <p className="group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {t.title}
                      </p>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {t.department?.name || t.category?.name || 'General'}
                      </span>
                    </td>

                    {/* Assignees */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {t.assigned_employees && t.assigned_employees.length > 0 ? (
                          t.assigned_employees.slice(0, 3).map((emp) => {
                            const isEmpAdmin = emp.user?.role === 'admin';
                            return (
                              <div
                                key={emp.id}
                                title={`${emp.first_name} ${emp.last_name}${isEmpAdmin ? ' [Admin]' : ''}`}
                                className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 ${
                                  isEmpAdmin
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-brand-600 text-white'
                                }`}
                              >
                                {emp.first_name.charAt(0)}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                        )}
                        {t.assigned_employees && t.assigned_employees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-slate-900">
                            +{t.assigned_employees.length - 3}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-3">{getPriorityBadge(t.priority)}</td>

                    {/* Status with Quick Toggle */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold focus:outline-none"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              t.progress === 100
                                ? 'bg-emerald-500'
                                : t.progress > 50
                                ? 'bg-brand-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                        <span className="font-bold text-[10px] text-slate-700">{t.progress}%</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className={`py-3.5 px-3 font-medium ${t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                      {t.due_date || 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedTaskId(t.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {t.status !== 'completed' && t.status !== 'cancelled' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Carry forward task "${t.title}" to next month?`)) return;
                              try {
                                const res = await taskApi.carryForwardSingleTask(t.id, { update_due_date: true });
                                success(res.data.message || 'Task carried forward to next month.');
                                fetchTasks();
                              } catch (err) {
                                error(err.response?.data?.message || 'Failed to carry forward.');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Carry Forward to Next Month"
                          >
                            <FastForward className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setTaskToEdit(t);
                            setIsTaskModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteTask(t.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTaskId(t.id)}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    TSK-{String(t.id).padStart(4, '0')}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {t.department?.name || t.category?.name || 'General'}
                    </span>
                    {getPriorityBadge(t.priority)}
                    {getStatusBadge(t.status)}
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {t.description || 'No description.'}
                </p>
              </div>

              {/* Progress & Deadlines */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Progress</span>
                  <span className="font-bold text-slate-800">{t.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: <strong className={t.is_overdue ? 'text-rose-600' : 'text-slate-700'}>{t.due_date || 'N/A'}</strong>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages} ({total} items)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="py-1 px-3 rounded-xl border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="py-1 px-3 rounded-xl border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={Boolean(selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => fetchTasks()}
          onEditTrigger={(t) => {
            setTaskToEdit(t);
            setIsTaskModalOpen(true);
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskSaved={() => fetchTasks()}
      />
    </div>
  );
};

export default TaskList;

