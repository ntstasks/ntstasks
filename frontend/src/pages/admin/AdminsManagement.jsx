import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { employeeApi, departmentApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  X,
  UserCheck
} from 'lucide-react';

const AdminsManagement = () => {
  const { success, error } = useToast();

  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Freeze background page scrolling while modal is open
  useBodyScrollLock(isModalOpen);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params = { role: 'admin' };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active';

      const res = await employeeApi.getEmployees(params);
      setAdmins(res.data.employees || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      error('Failed to load administrators list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    departmentApi.getDepartments().then((res) => setDepartments(res.data.departments || []));
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmins();
  };

  const handleOpenCreateModal = () => {
    setEditingAdmin(null);
    setEmail('');
    setPassword('Password123!');
    setEmployeeId('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setDesignation('System Administrator');
    setDepartmentId(departments[0]?.id || '');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setBio('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (adm) => {
    setEditingAdmin(adm);
    setEmail(adm.user?.email || '');
    setPassword('');
    setEmployeeId(adm.employee_id);
    setFirstName(adm.first_name);
    setLastName(adm.last_name);
    setPhone(adm.phone || '');
    setDesignation(adm.designation);
    setDepartmentId(adm.department?.id || '');
    setJoiningDate(adm.joining_date || '');
    setBio(adm.bio || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (empId) => {
    try {
      const res = await employeeApi.toggleStatus(empId);
      success(res.data.message);
      fetchAdmins();
    } catch (err) {
      error('Failed to update administrator status.');
    }
  };

  const handleDeleteAdmin = async (empId) => {
    if (!window.confirm('Are you sure you want to remove this administrator? This will revoke administrative access.')) return;
    try {
      await employeeApi.deleteEmployee(empId);
      success('Administrator removed successfully.');
      fetchAdmins();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to remove administrator.');
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        email,
        password: password || undefined,
        role: 'admin',
        employee_id: employeeId,
        first_name: firstName,
        last_name: lastName,
        phone,
        designation,
        department_id: departmentId ? parseInt(departmentId, 10) : null,
        joining_date: joiningDate,
        bio
      };

      if (editingAdmin) {
        await employeeApi.updateEmployee(editingAdmin.id, payload);
        success('Administrator updated successfully.');
      } else {
        await employeeApi.createEmployee(payload);
        success('Administrator created successfully.');
      }

      setIsModalOpen(false);
      fetchAdmins();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
              Administrator Management
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {total} Admins
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Manage system administrators, executive access credentials, and security privileges
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Add New Administrator</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search administrators by name, email, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-20 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1 px-3 py-1 rounded-md bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-500 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {search && (
            <button
              onClick={() => {
                setSearch('');
                fetchAdmins();
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Administrators Container (Responsive Cards on Mobile, Table on Desktop) */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs animate-pulse">Loading administrators...</div>
      ) : admins.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No administrators found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? 'No administrators match your search term.' : 'Click "Add New Administrator" above to add system administrators.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden w-full max-w-full">
          {/* Mobile Admin Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {admins.map((adm) => (
              <div key={adm.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800 text-sm">
                      {adm.first_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {adm.first_name} {adm.last_name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                          Admin
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(adm.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors shrink-0 ${
                      adm.user?.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {adm.user?.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Details */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Designation:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{adm.designation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Department:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{adm.department?.name || 'General Management'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{adm.user?.email || 'N/A'}</span>
                  </div>
                  {adm.phone && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-700 dark:text-slate-300">{adm.phone}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleOpenEditModal(adm)}
                    className="px-3 py-1.5 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAdmin(adm.id)}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg flex items-center gap-1 font-semibold transition-colors"
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Designation & Department</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Administrator Profile */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                          {adm.first_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {adm.first_name} {adm.last_name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                              Admin
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300">{adm.user?.email || 'N/A'}</span>
                        </div>
                        {adm.phone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{adm.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Designation & Department */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-semibold">{adm.designation}</span>
                        <span className="text-slate-400 block text-[11px]">
                          {adm.department?.name || 'General Management'}
                        </span>
                      </div>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {adm.user?.last_login ? new Date(adm.user.last_login).toLocaleDateString() : 'Never'}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(adm.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                          adm.user?.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                        title="Click to toggle status"
                      >
                        {adm.user?.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(adm)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Administrator"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(adm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Administrator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Administrator Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-contain animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp transition-colors">
              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {editingAdmin ? 'Edit Administrator Details' : 'Add New Administrator'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form id="admin-modal-form" onSubmit={handleSubmitForm} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 text-xs slick-scrollbar">
                {/* Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Admin Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingAdmin)}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      {editingAdmin ? 'Change Password (optional)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingAdmin}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingAdmin ? 'Leave empty to keep' : 'Min 6 chars'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Morgan"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {/* Designation & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Designation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. System Administrator"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </form>

              {/* Modal Actions Footer */}
              <div className="px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/90 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="admin-modal-form"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Create Administrator'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminsManagement;
