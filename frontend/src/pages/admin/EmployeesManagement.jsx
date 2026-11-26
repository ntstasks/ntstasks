import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import ExportReportModal from '../../components/reports/ExportReportModal';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MoreVertical,
  BarChart2,
  Edit,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  X,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

const EmployeesManagement = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Freeze background page scrolling while modal is open
  useBodyScrollLock(isModalOpen || Boolean(employeeToDelete));

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = { role: 'employee' };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active';

      const res = await employeeApi.getEmployees(params);
      setEmployees(res.data.employees || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setEmail(emp.user?.email || '');
    setPassword('');
    setRole(emp.user?.role || 'employee');
    setEmployeeId(emp.employee_id);
    setFirstName(emp.first_name);
    setLastName(emp.last_name);
    setPhone(emp.phone || '');
    setDesignation(emp.designation);
    setDepartment(typeof emp.department === 'string' ? emp.department : (emp.department?.name || ''));
    setJoiningDate(emp.joining_date || '');
    setBio(emp.bio || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (empId) => {
    try {
      const res = await employeeApi.toggleStatus(empId);
      success(res.data.message);
      fetchEmployees();
    } catch (err) {
      error('Failed to update status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      await employeeApi.deleteEmployee(employeeToDelete.id);
      success(`Employee "${employeeToDelete.first_name} ${employeeToDelete.last_name}" deleted successfully.`);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete employee.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setSubmitting(true);
    try {
      const payload = {
        email,
        password: password || undefined,
        role: 'employee',
        employee_id: employeeId,
        first_name: firstName,
        last_name: lastName,
        phone,
        designation,
        department: department.trim() || 'General',
        joining_date: joiningDate,
        bio
      };

      await employeeApi.updateEmployee(editingEmployee.id, payload);
      success('Employee updated successfully.');

      setIsModalOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-black tracking-tight">Employee Directory & Management</h2>
          <p className="text-xs text-slate-800 font-bold">
            Manage corporate members, role authorizations, and individual performance profiles
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by employee name, ID, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-20 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50"
          />
          <button
            type="submit"
            className="absolute right-2 top-1.5 px-3 py-1 rounded-lg bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-500"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
          >
            <option value="all">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Employees Container (Responsive Cards on Mobile, Table on Desktop) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors w-full max-w-full">
        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse text-xs">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No employees matching the criteria.
          </div>
        ) : (
          <>
            {/* Mobile Employee Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-sm">
                        {emp.first_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                          {emp.first_name} {emp.last_name}
                        </h4>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{emp.designation}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(emp.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors shrink-0 ${
                        emp.user?.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {emp.user?.is_active ? 'Active' : 'Deactivated'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium">
                      {typeof emp.department === 'string' ? emp.department : (emp.department?.name || 'General')}
                    </span>
                    {emp.user?.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        Employee
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => navigate(`/employees/${emp.id}/performance`)}
                      className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-brand-50 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(emp)}
                      className="px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setEmployeeToDelete(emp)}
                      className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto slick-scrollbar table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-800 text-xs font-black text-black dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Employee Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold flex items-center justify-center shrink-0">
                            {emp.first_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <span className="text-[11px] text-slate-400">{emp.designation}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {typeof emp.department === 'string' ? emp.department : (emp.department?.name || 'General')}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {emp.user?.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            Employee
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(emp.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                            emp.user?.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                          }`}
                          title="Click to toggle activation"
                        >
                          {emp.user?.is_active ? 'Active' : 'Deactivated'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/employees/${emp.id}/performance`)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Performance Analytics"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Employee"
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
          </>
        )}
      </div>

      {/* Create / Edit Employee Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden overscroll-contain animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
            {/* Modal Header (Fixed) */}
            <div className="px-5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Edit Employee Details
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body (Scrollable with min-h-0 for 14" screen visibility) */}
            <form id="employee-modal-form" onSubmit={handleSubmitForm} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 text-xs slick-scrollbar">
              {/* Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingEmployee)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {editingEmployee ? 'Change Password (optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingEmployee ? 'Leave empty to keep' : 'Min 6 chars'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Morgan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering, Sales, Marketing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs"
                  />
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Professional Bio</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Key responsibilities, technical expertise..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </form>

            {/* Modal Actions Footer (Fixed / Sticky - Always Visible) */}
            <div className="px-5 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-50/90 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-modal-form"
                disabled={submitting}
                className="px-5 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Employee Account
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Warning: Critical Action
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {employeeToDelete.first_name} {employeeToDelete.last_name}
              </div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{employeeToDelete.designation || 'Team Member'}</span>
                <span>&bull;</span>
                <span>
                  {typeof employeeToDelete.department === 'string'
                    ? employeeToDelete.department
                    : (employeeToDelete.department?.name || 'General')}
                </span>
              </div>
              {employeeToDelete.user?.email && (
                <div className="text-slate-500 dark:text-slate-400">
                  {employeeToDelete.user.email}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Do you really want to delete this employee? This action is permanent and will remove their system access, task assignments, and personal records.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Employee'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Export Report Configuration & Download Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default EmployeesManagement;

