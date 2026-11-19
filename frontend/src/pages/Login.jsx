import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi, departmentApi } from '../services/api';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Lock, Mail, Eye, EyeOff, X, ArrowRight, User, Briefcase, Building2, Phone } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [registering, setRegistering] = useState(false);

  // Departments for registration dropdown
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    departmentApi
      .getDepartments()
      .then((res) => {
        setDepartments(res.data.departments || []);
      })
      .catch(() => {});
  }, []);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  useBodyScrollLock(showForgotModal);
  const [forgotEmail, setForgotEmail] = useState('');
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [resetTokenReceived, setResetTokenReceived] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password, 'employee');
      success(`Welcome back, ${loggedUser.employee?.first_name || loggedUser.email}!`);
      navigate('/');
    } catch (err) {
      error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword) {
      error('Please enter first name, last name, email, and password.');
      return;
    }

    if (regPassword.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }

    setRegistering(true);
    try {
      const newUser = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: 'employee',
        designation: designation.trim() || 'Team Member',
        department_id: departmentId ? parseInt(departmentId, 10) : null,
        phone: phone.trim() || null
      });
      success(`Welcome, ${newUser.employee?.first_name || firstName}! Account created successfully.`);
      navigate('/');
    } catch (err) {
      error(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setRegistering(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setSubmittingForgot(true);
    try {
      const res = await authApi.forgotPassword({ email: forgotEmail });
      success(res.data.message);
      if (res.data.reset_token) {
        setResetTokenReceived(res.data.reset_token);
      }
    } catch (err) {
      error('Failed to request password reset.');
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTokenReceived || !newPassword) return;
    setResettingPassword(true);
    try {
      const res = await authApi.resetPassword({
        token: resetTokenReceived,
        new_password: newPassword
      });
      success(res.data.message);
      setShowForgotModal(false);
      setResetTokenReceived('');
      setNewPassword('');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Company Logo & Title */}
        <div className="text-center mb-5">
          <img
            src="/logo/nts_logo.png"
            alt="Company Logo"
            className="h-10 sm:h-12 w-auto object-contain mx-auto mb-2"
          />
          <h1 className="text-base font-bold text-slate-900">Employee Portal</h1>
          <p className="text-xs text-slate-500">Sign in to your employee workspace</p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black shadow-xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            Employee Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black shadow-xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            Register Employee
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In to Employee Portal'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 animate-fadeIn text-left text-xs">
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Morgan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Corporate Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Department (Admin Sets Departments) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
              >
                <option value="">Select Department (Configured by Admin)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation & Phone */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
            >
              {registering ? 'Creating Account...' : 'Register as Employee'}
            </button>
          </form>
        )}

        {/* Link to Admin Portal */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Are you an Administrator?
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-purple-600 hover:text-purple-500 transition-colors"
          >
            <span>Go to Admin Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 relative animate-scaleUp">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setResetTokenReceived('');
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your work email to receive a password reset token.
            </p>

            {!resetTokenReceived ? (
              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                <div>
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingForgot}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-xs disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                >
                  {submittingForgot ? 'Sending...' : 'Request Reset Token'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
                  Reset code generated. Set your new password:
                </div>
                <div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                >
                  {resettingPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
