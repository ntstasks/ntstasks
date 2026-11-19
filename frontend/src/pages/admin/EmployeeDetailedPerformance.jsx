import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsApi, taskApi } from '../../services/api';
import { getStatusBadge, getPriorityBadge } from '../../utils/statusBadges';
import TaskModal from '../../components/tasks/TaskModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Briefcase,
  Mail,
  Phone,
  BarChart2,
  TrendingUp,
  Percent,
  Timer,
  ChevronRight,
  ExternalLink,
  History,
  Edit
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const EmployeeDetailedPerformance = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleOpenEditTask = async (task) => {
    try {
      const res = await taskApi.getTaskById(task.id);
      setTaskToEdit(res.data.task || res.data || task);
    } catch (err) {
      console.error('Failed to load task details:', err);
      setTaskToEdit(task);
    }
    setIsTaskModalOpen(true);
  };

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const params = { date_filter: dateFilter };
      if (dateFilter === 'custom' && customStart && customEnd) {
        params.start_date = customStart;
        params.end_date = customEnd;
      }
      const res = await analyticsApi.getEmployeePerformance(id, params);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [id, dateFilter]);

  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (customStart && customEnd) {
      fetchPerformance();
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200/60 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200/60 rounded-3xl" />
      </div>
    );
  }

  const { employee, summary, charts, tasks, activity_logs } = data;

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      {/* Back button & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'today', 'this_week', 'this_month', 'last_month', 'custom'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setDateFilter(filterKey)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold capitalize transition-all ${
                dateFilter === filterKey
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {filterKey.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {dateFilter === 'custom' && (
        <form onSubmit={handleApplyCustomDates} className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Custom Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-500"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Employee Profile Header Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
            {employee.first_name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{employee.full_name}</h2>
            </div>
            <p className="text-xs font-semibold text-brand-600">
              {employee.designation} &bull; {employee.department?.name || 'Unassigned'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined: {employee.joining_date || 'N/A'}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {employee.user?.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Success Rate
            </span>
            <div className="text-2xl font-bold text-slate-900">{summary.completion_rate}%</div>
            <span className="text-[11px] text-emerald-600 font-semibold block">
              {summary.completed} of {summary.total_assigned} tasks completed
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            <Briefcase className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary.total_assigned}</div>
          <p className="text-[11px] text-slate-500 mt-1">{summary.in_progress} currently in progress</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{summary.completed}</div>
          <p className="text-[11px] text-slate-500 mt-1">{summary.pending} pending / on hold</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`text-2xl font-bold ${summary.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {summary.overdue}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.overdue > 0 ? 'Delayed tasks requiring follow-up' : 'Zero overdue milestones'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Completion Time</span>
            <Timer className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {summary.average_completion_time_days} <span className="text-sm font-semibold text-slate-500">days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Based on completed tasks timeline
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Task Trend</h3>
              <p className="text-xs text-slate-500">Assigned vs Completed over the past 6 months</p>
            </div>
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              Historical
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="assigned" name="Assigned" fill="#93C5FD" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Activity (Past 4 Weeks)</h3>
              <p className="text-xs text-slate-500">Weekly task velocity and completion frequency</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              4 Weeks
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.weekly_activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="created" name="Tasks Created" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task-Wise Details Table */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4 w-full max-w-full">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assigned Tasks ({tasks.length})</h3>
          <p className="text-xs text-slate-500">Complete task breakdown for this employee</p>
        </div>

        {tasks.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No tasks assigned in this date range.
          </div>
        ) : (
          <div>
            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleOpenEditTask(t)}
                  className="py-3 space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400">
                        #{String(t.id).padStart(4, '0')}
                      </span>
                      {getPriorityBadge(t.priority)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(t.status)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditTask(t);
                        }}
                        className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[10px] border border-brand-200/60"
                        title="Edit Task"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Category: <strong className="text-slate-700">{t.category}</strong></span>
                    <span>Due: <strong className={t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{t.due_date || 'N/A'}</strong></span>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="font-bold text-[10px] text-slate-700">{t.progress}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4 rounded-l-xl">Task Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3">Deadline</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenEditTask(t)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {t.title}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{t.category}</td>
                      <td className="py-3.5 px-3">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3.5 px-3">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px] text-slate-700">{t.progress}%</span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-3 font-medium ${t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {t.due_date || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTask(t);
                          }}
                          className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] transition-colors border border-brand-200/60"
                          title="Edit Task"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Log Section */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900">Recent Employee Activities</h3>
        </div>

        <div className="space-y-3">
          {activity_logs && activity_logs.length > 0 ? (
            activity_logs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800">{log.details}</p>
                  {log.task && (
                    <span className="text-[11px] text-brand-600 font-medium">Task: {log.task.title}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No recent activities found.</p>
          )}
        </div>
      </div>

      {/* Task Modal for Editing Tasks */}
      <TaskModal
        isOpen={isTaskModalOpen}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskSaved={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
          fetchPerformance();
        }}
      />
    </div>
  );
};

export default EmployeeDetailedPerformance;

