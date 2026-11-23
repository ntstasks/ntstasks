import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  X,
  User,
  Mail,
  Briefcase,
  ShieldCheck,
  Building,
  Phone,
  Calendar,
  CheckCircle2
} from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();
  useBodyScrollLock(isOpen);

  if (!isOpen || !user) return null;

  const emp = user.employee || {};
  const fullName = emp.first_name && emp.last_name
    ? `${emp.first_name} ${emp.last_name}`
    : user.email.split('@')[0];

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <User className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-black dark:text-white">My Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isAdmin ? 'System Administrator Profile' : 'Employee Profile Information'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 space-y-5">
          {/* Top Avatar Banner */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-black text-xl flex items-center justify-center uppercase shadow-sm shrink-0">
              {fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-black dark:text-white truncate">{fullName}</h4>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                {isAdmin ? 'System Administrator' : (emp.designation || 'Staff Member')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Role</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mt-1 capitalize">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>{user.role}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mt-1">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>{emp.department?.name || 'General Operations'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mt-1">
                <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                <span>{emp.designation || (isAdmin ? 'Executive Admin' : 'Employee')}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Contact</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mt-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{emp.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
