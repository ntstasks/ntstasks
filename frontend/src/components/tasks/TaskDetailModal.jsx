import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { taskApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { getStatusBadge, getPriorityBadge, getApprovalBadge } from '../../utils/statusBadges';
import {
  X,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Upload,
  Trash2,
  Edit,
  ExternalLink,
  FastForward
} from 'lucide-react';

const TaskDetailModal = ({ taskId, isOpen, onClose, onTaskUpdated, onEditTrigger }) => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  // Freeze background page scrolling while modal is open
  useBodyScrollLock(isOpen);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'attachments' | 'activity'

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isCarryForwarding, setIsCarryForwarding] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await taskApi.getTaskById(taskId);
      setTask(res.data.task);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load task details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await taskApi.addComment(taskId, newComment.trim());
      setNewComment('');
      success('Comment added.');
      fetchTaskDetails();
    } catch (err) {
      error('Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      await taskApi.uploadAttachment(taskId, formData);
      success('Attachment uploaded.');
      fetchTaskDetails();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to upload attachment.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await taskApi.deleteAttachment(attachmentId);
      success('Attachment deleted.');
      fetchTaskDetails();
    } catch (err) {
      error('Failed to delete attachment.');
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      success(`Status updated to ${newStatus}.`);
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      error('Failed to update status.');
    }
  };

  const handleReviewSubmit = async () => {
    setSubmittingReview(true);
    try {
      await taskApi.reviewTask(taskId, {
        action: reviewAction,
        feedback: reviewFeedback
      });
      success(`Task has been ${reviewAction === 'approve' ? 'approved' : 'marked for revisions'}.`);
      setShowReviewModal(false);
      setReviewFeedback('');
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCarryForwardTask = async () => {
    if (!task) return;
    const confirmMsg = `Carry forward task "${task.title}" to the next month?`;
    if (!window.confirm(confirmMsg)) return;

    setIsCarryForwarding(true);
    try {
      const res = await taskApi.carryForwardSingleTask(taskId, {
        update_due_date: true
      });
      success(res.data.message || 'Task successfully carried forward to next month.');
      window.dispatchEvent(new CustomEvent('nts:task-saved'));
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to carry forward task.');
    } finally {
      setIsCarryForwarding(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden overscroll-contain animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors relative">
        {/* Header (Fixed) */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
              TSK-{String(taskId).padStart(4, '0')}
            </span>
            <div className="flex items-center gap-2">
              {task && getPriorityBadge(task.priority)}
              {task && getStatusBadge(task.status)}
              {task?.approval_status && task.approval_status !== 'none' && getApprovalBadge(task.approval_status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditTrigger && (
              <button
                onClick={() => {
                  onClose();
                  onEditTrigger(task);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm animate-pulse">
            Loading task details...
          </div>
        ) : !task ? (
          <div className="p-16 text-center text-slate-500 text-sm">Task not found.</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Left Column: Details & Overview (Scrollable with min-h-0) */}
            <div className="w-full lg:w-3/5 p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain min-h-0 slick-scrollbar">
              {/* Overdue Banner */}
              {task.is_overdue && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>This task is overdue! Deadline was on {task.due_date}.</span>
                </div>
              )}

              {/* Title & Department */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">{task.title}</h2>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>Department:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {task.department?.name || task.category?.name || 'General'}
                  </span>
                  {task.planned_month && (
                    <>
                      <span>&bull;</span>
                      <span>Target Month:</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                        {task.planned_month}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Description Body */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {task.description || 'No detailed description provided.'}
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Current Progress</span>
                  <span className="text-brand-600 dark:text-brand-400">{task.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      task.progress === 100
                        ? 'bg-emerald-500'
                        : task.progress > 50
                        ? 'bg-brand-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Start Date</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">{task.start_date || 'N/A'}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Deadline</span>
                  <span className={`font-medium mt-0.5 block ${task.is_overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {task.due_date || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Assigned Employees */}
              <div>
                <h4 className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Assigned Team Members ({task.assigned_employees?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {task.assigned_employees && task.assigned_employees.length > 0 ? (
                    task.assigned_employees.map((emp) => {
                      const isEmpAdmin = emp.user?.role === 'admin';
                      return (
                        <div
                          key={emp.id}
                          className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5"
                        >
                          <div
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                              isEmpAdmin
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                            }`}
                          >
                            {emp.first_name.charAt(0)}
                          </div>
                          <span>
                            {emp.first_name} {emp.last_name}
                          </span>
                          {isEmpAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Admin
                            </span>
                          )}
                          {emp.department && (
                            <span className="text-[10px] text-slate-400">({emp.department.name})</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No assigned team members</span>
                  )}
                </div>
              </div>

              {/* Admin Review Feedback if present */}
              {task.feedback && (
                <div className="p-3.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
                  <span className="font-bold text-brand-900 dark:text-brand-300 block mb-1">Admin Feedback & Review Note:</span>
                  <p className="text-brand-800 dark:text-brand-200 italic">{task.feedback}</p>
                </div>
              )}

              {/* Quick Status & Rollover Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick Status:</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleQuickStatusChange(e.target.value)}
                    className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={isCarryForwarding}
                      onClick={handleCarryForwardTask}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      title="Carry forward this unfinished task to the next month"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>{isCarryForwarding ? 'Rolling Over...' : 'Carry Forward'}</span>
                    </button>
                  )}
                </div>

                {/* Admin Review Actions */}
                {isAdmin && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Review Task</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Comments, Attachments & History Tabs (With independent vertical scroll & fixed footer) */}
            <div className="w-full lg:w-2/5 flex flex-col bg-slate-50/40 dark:bg-slate-950/40 min-h-0 overflow-hidden">
              {/* Tabs (Fixed Header) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 shrink-0">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-3 px-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'comments'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/30'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comments ({task.comments?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`flex-1 py-3 px-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'attachments'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/30'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Files ({task.attachments?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 py-3 px-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'activity'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/30'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Activity</span>
                </button>
              </div>

              {/* Tab Content (Scrollable with min-h-0 for 14" screen visibility) */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 slick-scrollbar">
                {/* 1. Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="space-y-3">
                    {task.comments && task.comments.length > 0 ? (
                      task.comments.map((c) => {
                        const authorName = c.author?.employee
                          ? `${c.author.employee.first_name} ${c.author.employee.last_name}`
                          : c.author?.email;
                        return (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{authorName}</span>
                              <span className="text-slate-400 text-[10px]">
                                {new Date(c.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {c.comment}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No comments or progress updates yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Attachments Tab */}
                {activeTab === 'attachments' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Uploaded Documents</span>
                      <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          disabled={uploadingFile}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {task.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                              <div className="min-w-0">
                                <a
                                  href={`http://localhost:5000${att.file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-brand-600 truncate block hover:underline"
                                >
                                  {att.file_name}
                                </a>
                                <span className="text-[10px] text-slate-400">
                                  {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No attachments uploaded yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Activity Log Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {task.activity_logs && task.activity_logs.length > 0 ? (
                      task.activity_logs.map((log) => (
                        <div key={log.id} className="relative pl-5 border-l-2 border-brand-200 dark:border-brand-800 py-1">
                          <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-500" />
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{log.details}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
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
                      <div className="p-8 text-center text-xs text-slate-400">No activity recorded.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Fixed Comment Input Form at Bottom of Right Column */}
              {activeTab === 'comments' && (
                <form onSubmit={handleAddComment} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write progress update or note..."
                      className="w-full p-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="absolute right-2.5 bottom-3.5 p-1.5 text-brand-600 hover:text-brand-700 disabled:opacity-40 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Admin Review Sub-modal */}
        {showReviewModal && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-contain">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Task Review & Decision</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review employee completion and optionally provide constructive feedback.
                </p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 slick-scrollbar text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Action
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approve')}
                      className={`py-2 px-3 rounded-xl font-semibold border ${
                        reviewAction === 'approve'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-400'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewAction('request_changes')}
                      className={`py-2 px-3 rounded-xl font-semibold border ${
                        reviewAction === 'request_changes'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-400'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Revisions
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewAction('reopen')}
                      className={`py-2 px-3 rounded-xl font-semibold border ${
                        reviewAction === 'reopen'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-400'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Reopen
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Feedback Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="e.g. Excellent work! / Please double check the responsive styling..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={handleReviewSubmit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TaskDetailModal;
