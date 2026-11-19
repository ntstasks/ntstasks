import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/api';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, X } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { success, error } = useToast();

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Admin login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  useBodyScrollLock(showForgotModal);
  const [forgotEmail, setForgotEmail] = useState('');
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [resetTokenReceived, setResetTokenReceived] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password, 'admin');
      if (loggedUser.role !== 'admin') {
        error('Access denied. Administrator privileges required.');
        return;
      }
      success(`Welcome Administrator, ${loggedUser.employee?.first_name || loggedUser.email}!`);
      navigate('/');
    } catch (err) {
      error(err.response?.data?.message || 'Admin login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Header with Admin Badge */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/logo/nts_logo.png"
              alt="Company Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Console</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Portal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sign in with administrator credentials
          </p>
        </div>

        {/* Admin Sign In Form (Strictly login only - no self-registration) */}
        <form onSubmit={handleAdminLogin} className="space-y-4 animate-fadeIn">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Admin Email / Username
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Admin Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md shadow-purple-600/20 transition-all active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Authenticating Admin...' : 'Sign In to Admin Portal'}</span>
          </button>
        </form>

        {/* Link to Employee Portal */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Looking for Employee workspace?
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-brand-600 hover:text-brand-500 transition-colors"
          >
            <span>Go to Employee Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 relative animate-scaleUp">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setResetTokenReceived('');
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Reset Admin Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your admin email to receive a password reset token.
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingForgot}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                >
                  {submittingForgot ? 'Sending...' : 'Request Reset Token'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
                  Reset code generated. Enter your new password:
                </div>
                <div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
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

export default AdminLogin;
