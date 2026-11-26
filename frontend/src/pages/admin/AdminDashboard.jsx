import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  Users,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Percent,
  Search,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  // Trend Chart Time Range State
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const defaultStartStr = `${defaultStart.getFullYear()}-${String(defaultStart.getMonth() + 1).padStart(2, '0')}`;

  const [trendRange, setTrendRange] = useState('6'); // '3' | '6' | '12' | 'custom'
  const [customStartMonth, setCustomStartMonth] = useState(defaultStartStr);
  const [customEndMonth, setCustomEndMonth] = useState(currentMonthStr);

  const fetchStats = async (overrideParams = {}, isChartOnly = false) => {
    try {
      if (isChartOnly) setChartLoading(true);
      else setLoading(true);

      const params = {};
      const activeRange = overrideParams.trendRange !== undefined ? overrideParams.trendRange : trendRange;
      if (activeRange === 'custom') {
        params.start_month = overrideParams.startMonth || customStartMonth;
        params.end_month = overrideParams.endMonth || customEndMonth;
      } else {
        params.trend_months = activeRange;
      }

      const res = await analyticsApi.getAdminDashboard(params);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleTaskSaved = () => fetchStats();
    window.addEventListener('nts:task-saved', handleTaskSaved);
    return () => window.removeEventListener('nts:task-saved', handleTaskSaved);
  }, []);

  const handleRangeChange = (range) => {
    setTrendRange(range);
    if (range !== 'custom') {
      fetchStats({ trendRange: range }, true);
    }
  };

  const applyCustomRange = () => {
    if (!customStartMonth || !customEndMonth) return;
    fetchStats({ trendRange: 'custom', startMonth: customStartMonth, endMonth: customEndMonth }, true);
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
        <div className="h-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const { cards, charts, employee_table } = data;

  const filteredEmployees = (employee_table || []).filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const uniqueDepartments = Array.from(
    new Set((employee_table || []).map((e) => e.department).filter(Boolean))
  );

  const summaryCards = [
    {
      title: 'Total Employees',
      value: cards.total_employees,
      sub: `${cards.active_employees} active employees`,
      icon: Users,
      color: 'text-slate-800 dark:text-slate-200',
      bgColor: 'bg-slate-100 dark:bg-slate-800'
    },
    {
      title: 'Total Tasks',
      value: cards.total_tasks,
      sub: 'All registered tasks',
      icon: Clock,
      color: 'text-brand-600 dark:text-brand-400',
      bgColor: 'bg-brand-50 dark:bg-brand-950/50'
    },
    {
      title: 'Completed Tasks',
      value: cards.completed_tasks,
      sub: `${cards.overall_completion_rate}% completion rate`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50'
    },
    {
      title: 'In Progress Tasks',
      value: cards.in_progress_tasks,
      sub: 'Under active execution',
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50'
    },
    {
      title: 'On Hold Tasks',
      value: cards.on_hold_tasks ?? (cards.pending_tasks - (cards.not_started_tasks || 0)) ?? 0,
      sub: 'Paused or blocked',
      icon: PauseCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header bar (clean, without logo in body) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
            Organization Overview
          </h2>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-400">
            Monitor employee task progress and performance
          </p>
        </div>

        <button
          onClick={() => navigate('/employees')}
          className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 stroke-[2.2] text-emerald-600" />
          <span>Employees & Export Reports</span>
        </button>
      </div>

      {/* Clean 5 KPI Cards with Responsive Scaling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {summaryCards.map((c, i) => {
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

      {/* Monthly Performance Trend */}
      <div className="w-full">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
                  Monthly Task Completion Trend
                </h3>
                {chartLoading && (
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold animate-pulse">
                    Updating...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {trendRange === '3' && 'Showing past 3 months'}
                {trendRange === '6' && 'Showing past 6 months'}
                {trendRange === '12' && 'Showing past 12 months (1 Year)'}
                {trendRange === 'custom' && `Showing custom range (${customStartMonth} to ${customEndMonth})`}
              </p>
            </div>

            {/* Range Presets and Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {[
                  { id: '3', label: '3M' },
                  { id: '6', label: '6M' },
                  { id: '12', label: '12M' },
                  { id: 'custom', label: 'Custom' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleRangeChange(item.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      trendRange === item.id
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {trendRange === 'custom' && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-fadeIn">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1">From:</span>
                    <input
                      type="month"
                      value={customStartMonth}
                      max={customEndMonth || currentMonthStr}
                      onChange={(e) => setCustomStartMonth(e.target.value)}
                      className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">To:</span>
                    <input
                      type="month"
                      value={customEndMonth}
                      min={customStartMonth}
                      max={currentMonthStr}
                      onChange={(e) => setCustomEndMonth(e.target.value)}
                      className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    onClick={applyCustomRange}
                    className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthly_performance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, fontSize: '12px', fontWeight: 'bold', color: isDark ? '#ffffff' : '#000000' }} />
                <Area type="monotone" dataKey="created" name="Tasks Created" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={0} />
                <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#compGrad)" />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#e2e8f0' : '#000', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Performance Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-black dark:text-white">Employee Task Performance</h3>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-400">Summary of tasks assigned and completed by each team member</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-black dark:text-slate-400 absolute left-2.5 top-2.5 stroke-[2.2]" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>

            {/* Department */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsive Mobile Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-xs">
              No employees matching filter.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}/performance`)}
                className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-black dark:text-white font-black text-xs flex items-center justify-center shrink-0 border border-transparent dark:border-slate-700">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-black text-black dark:text-white text-xs block">{emp.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {emp.designation}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {emp.department}
                  </span>
                </div>

                {/* 5 Mini Metrics */}
                <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Assigned</span>
                    <span className="font-black text-slate-900 dark:text-white">{emp.assigned}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Done</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{emp.completed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Active</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{emp.in_progress}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Hold</span>
                    <span className="font-black text-amber-600 dark:text-amber-400">{emp.on_hold || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Overdue</span>
                    <span className={`font-black ${emp.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {emp.overdue}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clean Table for Desktop (>= md) */}
        <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container w-full max-w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-800 text-xs font-black text-black dark:text-white uppercase bg-slate-100 dark:bg-slate-800">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-center">Assigned</th>
                <th className="py-2.5 px-3 text-center">Completed</th>
                <th className="py-2.5 px-3 text-center">In Progress</th>
                <th className="py-2.5 px-3 text-center">Hold</th>
                <th className="py-2.5 px-3 text-center">Overdue</th>
                <th className="py-2.5 px-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-black dark:text-slate-400 font-semibold">
                    No employees matching filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}/performance`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-bold text-black dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-black dark:text-white font-black text-xs flex items-center justify-center shrink-0 border border-transparent dark:border-slate-700">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-black text-black dark:text-white block">{emp.name}</span>
                          <span className="text-[11px] text-slate-800 dark:text-slate-400 font-semibold">{emp.designation}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-black dark:text-slate-300">{emp.department}</td>
                    <td className="py-3 px-3 text-center font-black text-black dark:text-white">{emp.assigned}</td>
                    <td className="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">{emp.completed}</td>
                    <td className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">{emp.in_progress}</td>
                    <td className="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400">
                      {emp.on_hold > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black">
                          {emp.on_hold}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-rose-600 dark:text-rose-400">
                      {emp.overdue > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-black">
                          {emp.overdue}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employees/${emp.id}/performance`);
                        }}
                        className="py-1 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-black dark:text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
