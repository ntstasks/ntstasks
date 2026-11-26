import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Custom Confirmation Modal for Deleting Tasks
 * Replaces the native browser window.confirm with a modern, theme-aware pop-up.
 */
const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  taskTitle = '',
  taskId = null,
  loading = false
}) => {
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 overflow-hidden animate-scaleUp transition-colors relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-40"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-13 h-13 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Do you really want to delete this task?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This action cannot be undone. The task and all associated comments or attachments will be permanently deleted.
          </p>
        </div>

        {/* Task Details Highlight Box */}
        {taskTitle && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
            {taskId && (
              <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                #TSK-{String(taskId).padStart(4, '0')}
              </span>
            )}
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
              "{taskTitle}"
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
                <span>Yes, Delete Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDeleteModal;
