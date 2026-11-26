import React, { useState, useEffect } from 'react';
import { reportApi, departmentApi, employeeApi, taskApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getStatusBadge, getPriorityBadge } from '../../utils/statusBadges';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Calendar,
  Briefcase,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowDownToLine,
  Eye
} from 'lucide-react';

const Reports = () => {
  const { success, error } = useToast();

  const [reportType, setReportType] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Preview data
  const [previewTasks, setPreviewTasks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    departmentApi.getDepartments().then((res) => setDepartments(res.data.departments || []));
    employeeApi.getEmployees().then((res) => setEmployees(res.data.employees || []));
  }, []);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const params = {
        limit: 50
      };
      if (reportType === 'completed') params.status = 'completed';
      if (reportType === 'pending') params.status = 'in_progress';
      if (month) params.month = month;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (departmentId !== 'all') params.department_id = departmentId;
      if (employeeId !== 'all') params.employee_id = employeeId;

      const res = await taskApi.getTasks(params);
      let list = res.data.tasks || [];
      if (reportType === 'overdue') {
        list = list.filter((t) => t.is_overdue);
      }
      setPreviewTasks(list);
    } catch (err) {
      error('Failed to load report preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [reportType, departmentId, employeeId, startDate, endDate, month]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = {
        report_type: reportType,
        department_id: departmentId,
        employee_id: employeeId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        month: month || undefined
      };
      const response = await reportApi.exportExcel(params);

      // Trigger browser download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NTS_Task_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      success('Excel report downloaded successfully.');
    } catch (err) {
      error('Failed to export Excel report.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = {
        report_type: reportType,
        department_id: departmentId,
        employee_id: employeeId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        month: month || undefined
      };
      const response = await reportApi.exportPdf(params);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NTS_Task_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      success('PDF report downloaded successfully.');
    } catch (err) {
      error('Failed to export PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-black tracking-tight">Reports & Export Center</h2>
          <p className="text-xs text-slate-800 font-bold">
            Generate verifiable corporate Excel spreadsheets and PDF audit summaries from actual database records
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportingExcel ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingPdf ? 'Generating...' : 'Export PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters Form */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>Report Configuration & Filtering</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Report Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Report Category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">Complete Task Inventory</option>
              <option value="completed">Completed Deliverables Only</option>
              <option value="pending">Pending & In-Progress Only</option>
              <option value="overdue">Overdue & Delayed Tasks</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Department Scope</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Individual Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}{e.designation ? ` (${e.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Month */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Specific Month (optional)</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Date Range Sub-row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Live Data Preview */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Report Preview ({previewTasks.length} matching records)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Preview of records that will be exported to Excel / PDF
          </span>
        </div>

        {loadingPreview ? (
          <div className="p-16 text-center text-slate-400 text-xs animate-pulse">
            Generating live report preview...
          </div>
        ) : previewTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No records found matching the configured report parameters.
          </div>
        ) : (
          <div>
            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {previewTasks.map((t) => (
                <div key={t.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400">#{String(t.id).padStart(4, '0')}</span>
                      {getPriorityBadge(t.priority)}
                    </div>
                    {getStatusBadge(t.status)}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{t.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{t.category?.name || 'General'}</strong></span>
                    <span>Due: <strong className={t.is_overdue ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>{t.due_date || 'N/A'}</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Assignee: <span className="text-slate-700 dark:text-slate-300 font-medium">{t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-800 text-xs font-black text-black dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800">
                    <th className="py-3 px-4 rounded-l-xl">Task ID</th>
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Assignee(s)</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 font-semibold">Progress</th>
                    <th className="py-3 px-4 rounded-r-xl">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {previewTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        #{String(t.id).padStart(4, '0')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{t.category?.name || 'General'}</td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned'}
                      </td>
                      <td className="py-3 px-3">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3 px-3">{getStatusBadge(t.status)}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{t.progress}%</td>
                      <td className={`py-3 px-4 font-medium ${t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
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
    </div>
  );
};

export default Reports;

