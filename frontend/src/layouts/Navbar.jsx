import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UpdatePasswordModal from '../components/profile/UpdatePasswordModal';
import {
  Menu,
  KeyRound,
  ChevronDown,
  Plus,
  Sun,
  Moon
} from 'lucide-react';

const Navbar = ({ isSidebarOpen, toggleSidebar, onOpenCreateTask }) => {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean, concise page titles
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/monthly-planner')) return 'Monthly Tasks';
    if (path.startsWith('/team-overview')) return 'Departments';
    if (path.startsWith('/employees')) return 'Employees';
    if (path.startsWith('/admins')) return 'Administrators';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const userName = user?.employee
    ? `${user.employee.first_name} ${user.employee.last_name}`
    : user?.email;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left: Mobile Toggle (on phone/tablet only) & Clean Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <Menu className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="text-sm sm:text-base md:text-lg font-black text-black dark:text-white tracking-tight truncate max-w-[140px] sm:max-w-xs md:max-w-none">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right Controls: Theme Toggle & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Round Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-black dark:text-white transition-all cursor-pointer shadow-xs shrink-0 select-none"
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 stroke-[2.2]" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-slate-800 dark:text-slate-200 stroke-[2.2]" />
          )}
        </button>

        {/* User Pill */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase border border-transparent dark:border-slate-700">
              {userName?.charAt(0) || 'U'}
            </div>
            <span className="hidden md:inline text-xs font-black text-black dark:text-white max-w-[120px] lg:max-w-[150px] truncate">
              {userName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-black dark:text-white stroke-[2.2] hidden sm:inline" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-black text-black dark:text-white truncate">{userName}</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-400 font-semibold truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileDropdown(false);
                  setIsPasswordOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 stroke-[2.2] text-amber-600 dark:text-amber-400" />
                <span>Update Password</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Update Password Modal */}
      <UpdatePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />
    </header>
  );
};

export default Navbar;
