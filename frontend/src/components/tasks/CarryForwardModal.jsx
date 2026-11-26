import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { taskApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { getStatusBadge, getPriorityBadge } from '../../utils/statusBadges';
import {
  X,
  FastForward,
  ArrowRight,
  Calendar,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Filter
} from 'lucide-react';

const CarryForwardModal = ({
  isOpen,
  onClose,
  targetMonth: initialTargetMonth,
  onSuccess
}) => {
  const { success, error } = useToast();

  // Freeze background page scrolling while modal is open
  useBodyScrollLock(isOpen);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const targetMonth = initialTargetMonth || currentMonthStr;

  // Compute default previous month
  const computePrevMonth = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  };

  const [sourceMonth, setSourceMonth] = useState(computePrevMonth(targetMonth));
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updateDueDates, setUpdateDueDates] = useState(true);
  const [customDueDate, setCustomDueDate] = useState('');

  // Human-readable labels
  const formatMonthLabel = (ym) => {
    if (!ym || ym === 'all_prior') return 'All Prior Incomplete';
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await taskApi.getCarryForwardCandidates({
        source_month: sourceMonth,
        target_month: targetMonth
      });
      const list = res.data.tasks || [];
      setCandidates(list);
      // Select all incomplete tasks by default for convenient one-click action
      setSelectedIds(list.map((t) => t.id));
    } catch (err) {
      console.error('Failed to load carry forward candidates:', err);
      error(err.response?.data?.message || 'Failed to find eligible tasks to carry forward.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    }
  }, [isOpen, sourceMonth, targetMonth]);

  if (!isOpen) return null;

  const handleToggleTask = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map((t) => t.id));
    }
  };

  const handleCarryForwardSubmit = async () => {
    if (selectedIds.length === 0) {
      error('Please select at least one task to carry forward.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        task_ids: selectedIds,
        target_month: targetMonth,
        update_due_dates: updateDueDates,
        new_due_date: customDueDate || null
      };

      const res = await taskApi.carryForwardTasks(payload);
      success(res.data.message || `Carried forward ${selectedIds.length} tasks to ${formatMonthLabel(targetMonth)}.`);

      // Notify other views
      window.dispatchEvent(new CustomEvent('nts:task-saved'));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to carry forward:', err);
      error(err.response?.data?.message || 'Failed to carry forward selected tasks.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-hidden overscroll-contain animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
        {/* Header (Fixed) */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/90 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FastForward className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Carry Forward Tasks</span>
                <span className="px-2 py-0.2 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[10px] font-bold">
                  Monthly Rollover
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Move unfinished assignments from previous period into {formatMonthLabel(targetMonth)}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Selector Bar (Fixed) */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">Source:</span>
            <select
              value={sourceMonth}
              onChange={(e) => setSourceMonth(e.target.value)}
              className="py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none"
            >
              <option value={computePrevMonth(targetMonth)}>
                Last Month ({formatMonthLabel(computePrevMonth(targetMonth))})
              </option>
              <option value="all_prior">All Prior Incomplete Tasks</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">Target Month:</span>
            <span className="py-1 px-2.5 rounded-lg bg-brand-600 text-white font-black text-xs shadow-xs">
              {formatMonthLabel(targetMonth)}
            </span>
          </div>
        </div>

        {/* Content Body: Task Checklist (Scrollable with min-h-0 for 14" screens) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 slick-scrollbar">
          {loading ? (
            <div className="p-10 sm:p-12 text-center text-slate-400 text-xs animate-pulse space-y-2">
              <Clock className="w-6 h-6 mx-auto text-slate-300 animate-spin" />
              <p>Scanning for unfinished tasks from {formatMonthLabel(sourceMonth)}...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-10 sm:p-12 text-center space-y-2.5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Incomplete Tasks to Carry Forward!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                All assignments from {formatMonthLabel(sourceMonth)} are completed or have already been rolled over to {formatMonthLabel(targetMonth)}.
              </p>
            </div>
          ) : (
            <>
              {/* Select All Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                >
                  {selectedIds.length === candidates.length ? (
                    <CheckSquare className="w-4 h-4 text-brand-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {selectedIds.length === candidates.length
                      ? 'Deselect All'
                      : `Select All (${candidates.length} Tasks)`}
                  </span>
                </button>

                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {selectedIds.length} of {candidates.length} selected
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 sm:space-y-2.5">
                {candidates.map((task) => {
                  const isChecked = selectedIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-brand-50/40 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400">
                            #TSK-{String(task.id).padStart(4, '0')}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {task.title}
                          </span>
                          {task.is_overdue && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              OVERDUE
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                          {getPriorityBadge(task.priority)}
                          {getStatusBadge(task.status)}
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Progress: <strong className="text-slate-800 dark:text-slate-200">{task.progress}%</strong>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Due: <strong className={task.is_overdue ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>{task.due_date || 'N/A'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Rollover Settings Box */}
          {candidates.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDueDates}
                  onChange={(e) => setUpdateDueDates(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                  Automatically adjust overdue deadlines to end of {formatMonthLabel(targetMonth)}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  Or specify a specific target deadline:
                </span>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer (Fixed) */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || selectedIds.length === 0}
            onClick={handleCarryForwardSubmit}
            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            <FastForward className="w-4 h-4" />
            <span>
              {submitting
                ? 'Processing Rollover...'
                : `Carry Forward ${selectedIds.length} Task${selectedIds.length === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CarryForwardModal;
