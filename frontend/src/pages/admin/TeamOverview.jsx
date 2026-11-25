import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { departmentApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  Briefcase,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';

const TeamOverview = () => {
  const { success, error } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Freeze background page scrolling while modal is open
  useBodyScrollLock(isModalOpen);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentApi.getDepartments();
      setDepartments(res.data.departments || []);
    } catch (err) {
      error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsModalOpen(true);
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? Employees will be marked as unassigned.')) return;
    try {
      await departmentApi.deleteDepartment(id);
      success('Department deleted.');
      fetchDepartments();
    } catch (err) {
      error('Failed to delete department.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (editingDept) {
        await departmentApi.updateDepartment(editingDept.id, { name: name.trim(), description: description.trim() });
        success('Department updated successfully.');
      } else {
        await departmentApi.createDepartment({ name: name.trim(), description: description.trim() });
        success('Department created successfully.');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-black tracking-tight">Team & Department Hub</h2>
          <p className="text-xs text-slate-800 font-bold">
            Cross-functional business units, roster allocation, and departmental task completion rates
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200/60 rounded-3xl" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
          No departments configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(dept)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Department"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {dept.description || 'No department description provided.'}
                </p>
              </div>

              {/* Progress and KPIs */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Completion Rate</span>
                  <span className="font-extrabold text-slate-900">{dept.completion_rate}%</span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dept.completion_rate >= 80
                        ? 'bg-emerald-500'
                        : dept.completion_rate >= 50
                        ? 'bg-brand-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${dept.completion_rate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Members</span>
                    <span className="text-xs font-bold text-slate-800">{dept.total_employees}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tasks</span>
                    <span className="text-xs font-bold text-slate-800">{dept.total_tasks}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Done</span>
                    <span className="text-xs font-bold text-emerald-600">{dept.completed_tasks}</span>
                  </div>
                </div>

                {/* Team Avatars */}
                {dept.employees && dept.employees.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Assigned Personnel:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {dept.employees.slice(0, 4).map((e) => (
                        <span
                          key={e.id}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700 truncate max-w-[140px]"
                        >
                          {e.name}
                        </span>
                      ))}
                      {dept.employees.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-bold text-slate-600">
                          +{dept.employees.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden overscroll-contain animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
            {/* Header (Fixed) */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50/80 dark:bg-slate-950">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body (Scrollable with min-h-0 for 14" screen visibility) */}
            <form id="dept-modal-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 text-xs slick-scrollbar">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cloud Infrastructure"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Responsibilities, mission, scope..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </form>

            {/* Footer (Fixed / Sticky - Always Visible) */}
            <div className="px-5 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 sm:gap-3 shrink-0 bg-slate-50/90 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="dept-modal-form"
                disabled={submitting}
                className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                {submitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeamOverview;

