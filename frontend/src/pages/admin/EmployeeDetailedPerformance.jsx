import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getStatusBadge, getPriorityBadge } from '../../utils/statusBadges';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Briefcase,
  Mail,
  Phone,
  BarChart2,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const EmployeeDetailedPerformance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const now = new Date();
  const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth };
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
  }, [id, selectedMonth]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200/80 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/60 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200/60 rounded-2xl" />
      </div>
    );
  }

  const { employee, summary, charts, tasks, activity_logs } = data;

  const [y, m] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(y, m - 1, 1);
  const monthLabel = monthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Ground truth task statistics derived directly from loaded tasks list for selected month
  const taskRecords = Array.isArray(tasks) ? tasks : [];
  const normStatus = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_').trim();

  const totalAssigned = taskRecords.length > 0 ? taskRecords.length : (summary?.total_assigned ?? 0);
  const completedCount = taskRecords.length > 0
    ? taskRecords.filter((t) => normStatus(t.status) === 'completed').length
    : (summary?.completed ?? 0);
  const inProgressCount = taskRecords.length > 0
    ? taskRecords.filter((t) => normStatus(t.status) === 'in_progress').length
    : (summary?.in_progress ?? 0);
  const onHoldCount = taskRecords.length > 0
    ? taskRecords.filter((t) => normStatus(t.status) === 'on_hold' || normStatus(t.status) === 'hold').length
    : (summary?.on_hold ?? summary?.on_hold_tasks ?? 0);
  const notStartedCount = taskRecords.length > 0
    ? taskRecords.filter((t) => normStatus(t.status) === 'not_started').length
    : (summary?.not_started ?? summary?.not_started_tasks ?? 0);

  // Synchronize monthly trends chart data with active month's true counts
  const chartTrendsData = (charts?.monthly_trends || []).map((mItem) => {
    const isCurrentMonth = mItem.monthKey === selectedMonth ||
      (mItem.month && monthLabel && mItem.month.toLowerCase().startsWith(monthLabel.slice(0, 3).toLowerCase()));
    if (isCurrentMonth) {
      return {
        ...mItem,
        assigned: totalAssigned,
        completed: completedCount,
        in_progress: inProgressCount,
        on_hold: onHoldCount,
        not_started: notStartedCount
      };
    }
    return mItem;
  });

  // Calculate total tasks across all 6 trend months
  const totalChartTasks = chartTrendsData.reduce(
    (sum, item) => sum + (item.assigned || ((item.completed || 0) + (item.in_progress || 0) + (item.on_hold || 0) + (item.not_started || 0))),
    0
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload || {};
      const completed = dataPoint.completed || 0;
      const inProgress = dataPoint.in_progress || 0;
      const onHold = dataPoint.on_hold || 0;
      const notStarted = dataPoint.not_started || 0;
      const total = dataPoint.assigned ?? (completed + inProgress + onHold + notStarted);

      return (
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-2 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-black text-xs text-black dark:text-white">{label}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Total: <strong className="text-black dark:text-white">{total}</strong>
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                Completed:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{completed}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                In Progress:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{inProgress}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                On Hold:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{onHold}</span>
            </div>

            {notStarted > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  Not Started:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{notStarted}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header bar: Back Button & Month Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          <span>Back to Overview</span>
        </button>

        {/* Month Dropdown */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-300 dark:border-slate-700 shadow-xs self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <label htmlFor="perf-month-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Month:
          </label>
          <input
            id="perf-month-select"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-black text-black dark:text-white focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Simplified Employee Profile Header Card (Without Joined & Success Rate) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-brand-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm uppercase">
            {employee.first_name?.charAt(0) || 'E'}
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-black dark:text-white truncate">
              {employee.full_name}
            </h2>
            <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {employee.designation} &bull; {typeof employee.department === 'string' ? employee.department : (employee.department?.name || 'General')}
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {employee.user?.email || 'N/A'}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold self-start md:self-auto bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span>Active Period: <strong className="text-black dark:text-white font-bold">{monthLabel}</strong></span>
        </div>
      </div>

      {/* KPI Metric Cards for Selected Month (Independent counts for all statuses) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Assigned
            </span>
            <Briefcase className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl font-black text-black dark:text-white">{totalAssigned}</div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tasks scheduled for {monthLabel}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Deliverables achieved</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              In Progress
            </span>
            <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{inProgressCount}</div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Under active work</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              On Hold
            </span>
            <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {onHoldCount}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Paused or blocked</p>
        </div>
      </div>

      {/* Monthly Task Trend: Stacked Bar Chart (Completed, In Progress, On Hold, Not Started) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">
              Monthly Task Trend (Stacked Breakdown)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Task distribution by status across the 6-month period ending in {monthLabel}
            </p>
          </div>

          {/* Quick status breakdown badge pills for current month */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {completedCount} Completed
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {inProgressCount} In Progress
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {onHoldCount} On Hold
            </span>
            {notStartedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {notStartedCount} Not Started
              </span>
            )}
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {totalChartTasks === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <BarChart2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No task activity recorded across this 6-month period</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tasks planned or assigned for {monthLabel} will be graphed here automatically.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartTrendsData}
                margin={{ top: 15, right: 15, left: -15, bottom: 0 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1E293B' : '#F1F5F9'} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                />
                <Bar dataKey="completed" name="Completed" stackId="taskStatus" fill="#10B981" />
                <Bar dataKey="in_progress" name="In Progress" stackId="taskStatus" fill="#3B82F6" />
                <Bar dataKey="on_hold" name="On Hold" stackId="taskStatus" fill="#F59E0B" />
                <Bar dataKey="not_started" name="Not Started" stackId="taskStatus" fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Assigned Tasks Section (Without Action Button) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 w-full max-w-full transition-colors">
        <div>
          <h3 className="text-sm font-black text-black dark:text-white">
            Assigned Tasks for {monthLabel} ({tasks.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Complete task breakdown for this employee</p>
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No tasks assigned for {monthLabel}.
          </div>
        ) : (
          <div>
            {/* Mobile Cards (< md) - Action button removed */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((t) => (
                <div key={t.id} className="py-3.5 space-y-2">
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
                    <div>{getStatusBadge(t.status)}</div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{t.title}</h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Category: <strong className="text-slate-700 dark:text-slate-300">{t.category}</strong></span>
                    <span>Due: <strong className={t.is_overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>{t.due_date || 'N/A'}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) - Action column removed */}
            <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-950/60">
                    <th className="py-3 px-4 rounded-l-xl">Task Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 rounded-r-xl">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
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
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">{t.category}</td>
                      <td className="py-3.5 px-3">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3.5 px-3">{getStatusBadge(t.status)}</td>
                      <td className={`py-3.5 px-4 font-medium ${t.is_overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {t.due_date || 'N/A'}
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
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-black text-black dark:text-white">Recent Employee Activities</h3>
        </div>

        <div className="space-y-2.5">
          {activity_logs && activity_logs.length > 0 ? (
            activity_logs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{log.details}</p>
                  {log.task && (
                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">Task: {log.task.title}</span>
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
    </div>
  );
};

export default EmployeeDetailedPerformance;
