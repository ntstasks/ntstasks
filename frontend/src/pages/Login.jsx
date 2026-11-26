import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/api';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Lock, Mail, Eye, EyeOff, X, ArrowRight, User, Briefcase, Building2, Phone, KeyRound, CheckCircle2 } from 'lucide-react';

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
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [registering, setRegistering] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  useBodyScrollLock(showForgotModal);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Email, 2 = OTP & New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
        department: department.trim() || 'General',
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
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      error('Please enter your work email address.');
      return;
    }
    setSubmittingForgot(true);
    try {
      const res = await authApi.forgotPassword({
        email: forgotEmail.trim(),
        portal: 'employee'
      });
      success(res.data.message || `Verification code sent to ${forgotEmail.trim()}! Please check your mailbox.`);
      setForgotStep(2);
      setOtp('');
      setResendCooldown(60);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      error('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      error('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== resetConfirmPassword) {
      error('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await authApi.resetPassword({
        email: forgotEmail.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        portal: 'employee'
      });
      success(res.data.message || 'Password reset successfully! You can now log in.');
      setShowForgotModal(false);
      setForgotStep(1);
      setOtp('');
      setNewPassword('');
      setResetConfirmPassword('');
      setForgotEmail('');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to reset password. Please check your verification code.');
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
            className="h-10 sm:h-12 w-auto object-contain mx-auto mb-2 dark:hidden"
          />
          <img
            src="/logo/nts_logo_dark.png"
            alt="Company Logo"
            className="h-10 sm:h-12 w-auto object-contain mx-auto mb-2 hidden dark:block"
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

            {/* Department (Text Input) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Sales, Marketing"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900"
              />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-7 relative animate-scaleUp transition-colors">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setResetTokenReceived('');
                setNewPassword('');
                setResetConfirmPassword('');
              }}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Icon */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs border border-brand-100 dark:border-brand-900/50">
                <KeyRound className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {forgotStep === 1
                    ? 'Enter your work email to receive a 6-digit OTP'
                    : 'Enter the code sent to your email & set a new password'}
                </p>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1.5 rounded-full transition-all ${forgotStep === 1 ? 'bg-brand-600' : 'bg-emerald-500'}`} />
              <div className={`flex-1 h-1.5 rounded-full transition-all ${forgotStep === 2 ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
            </div>

            {forgotStep === 1 ? (
              /* Step 1: Email Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingForgot}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/25 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{submittingForgot ? 'Sending Code...' : 'Send OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: OTP + New Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="truncate">
                      Code sent to <strong>{forgotEmail}</strong>. Check your mailbox.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setOtp('');
                    }}
                    className="text-[11px] font-bold underline hover:no-underline text-brand-700 dark:text-brand-400 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* 6-Digit OTP Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      6-Digit OTP Code
                    </label>
                    {resendCooldown > 0 ? (
                      <span className="text-[11px] text-slate-400">Resend in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={submittingForgot}
                        className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg font-extrabold py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {resetConfirmPassword && newPassword !== resetConfirmPassword && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setOtp('');
                      setNewPassword('');
                      setResetConfirmPassword('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword || otp.length !== 6 || newPassword.length < 8 || newPassword !== resetConfirmPassword}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{resettingPassword ? 'Updating...' : 'Set Password'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
