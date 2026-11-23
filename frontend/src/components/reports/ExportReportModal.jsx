import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reportApi, departmentApi, employeeApi, taskApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  X,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download
} from 'lucide-react';

const ExportReportModal = ({ isOpen, onClose }) => {
  const { success, error } = useToast();

  useBodyScrollLock(isOpen);

  const [reportType, setReportType] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Preview count
  const [matchingCount, setMatchingCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      departmentApi.getDepartments().then((res) => setDepartments(res.data.departments || []));
      employeeApi.getEmployees({ is_active: 'true' }).then((res) => setEmployees(res.data.employees || []));
    }
  }, [isOpen]);

  // Compute matching count whenever filters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingCount(true);

    const params = { limit: 1 };
    if (reportType === 'completed') params.status = 'completed';
    if (reportType === 'pending') params.status = 'in_progress';
    if (month) params.month = month;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (departmentId !== 'all') params.department_id = departmentId;
    if (employeeId !== 'all') params.employee_id = employeeId;

    taskApi.getTasks(params)
      .then((res) => {
        if (isMounted) {
          setMatchingCount(res.data.total ?? (res.data.tasks?.length || 0));
        }
      })
      .catch(() => {
        if (isMounted) setMatchingCount(null);
      })
      .finally(() => {
        if (isMounted) setLoadingCount(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, reportType, departmentId, employeeId, startDate, endDate, month]);

  if (!isOpen) return null;

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
      onClose();
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
      onClose();
    } catch (err) {
      error('Failed to export PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleResetFilters = () => {
    setReportType('all');
    setDepartmentId('all');
    setEmployeeId('all');
    setStartDate('');
    setEndDate('');
    setMonth('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden overscroll-contain animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Export Task & Employee Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure filters and export verified database records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 text-xs slick-scrollbar">
          {/* Employee Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Employee
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Employees (Company-Wide)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}{emp.designation ? ` (${emp.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Department & Status Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Task Status Scope
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs"
              >
                <option value="all">All Statuses (Full Audit)</option>
                <option value="completed">Completed Deliverables Only</option>
                <option value="pending">In Progress & Pending</option>
                <option value="overdue">Overdue Milestones Only</option>
              </select>
            </div>
          </div>

          {/* Date Filtering: Month OR Custom Range */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Date & Period Filters
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Specific Month
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    if (e.target.value) {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) setMonth('');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value) setMonth('');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Records Summary Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Matching Task Records:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {loadingCount ? 'Calculating...' : matchingCount !== null ? `${matchingCount} tasks` : 'Ready to export'}
            </span>
          </div>
        </div>

        {/* Modal Footer with Export Buttons */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/80 dark:bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || exportingPdf}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingExcel ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingExcel || exportingPdf}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{exportingPdf ? 'Generating...' : 'Export PDF (.pdf)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportReportModal;
