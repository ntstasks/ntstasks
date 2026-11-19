import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Target,
  Users,
  ShieldCheck,
  Briefcase,
  Settings,
  LogOut,
  Plus,
  X,
  Menu
} from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, onClose, onOpenCreateTask }) => {
  const { user, isAdmin, logout } = useAuth();
  const [hoveredTooltip, setHoveredTooltip] = useState(null); // { label, top }

  const employeeName = user?.employee
    ? `${user.employee.first_name} ${user.employee.last_name}`
    : user?.email;
  const employeeRole = isAdmin ? 'Administrator' : user?.employee?.designation || 'Employee';

  // Navigation items: Streamlined & reorganized
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'employee']
    },
    {
      to: '/monthly-planner',
      label: 'Monthly Tasks',
      icon: Target,
      roles: ['admin', 'employee']
    },
    // Admin Only
    {
      to: '/employees',
      label: 'Employees',
      icon: Users,
      roles: ['admin']
    },
    {
      to: '/admins',
      label: 'Administrators',
      icon: ShieldCheck,
      roles: ['admin']
    },
    {
      to: '/team-overview',
      label: 'Departments',
      icon: Briefcase,
      roles: ['admin']
    },
    // Shared
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin', 'employee']
    }
  ];

  const handleMouseEnter = (e, label) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({
        label,
        top: rect.top + rect.height / 2
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Floating Hover Tooltip for Collapsed Menu (Positioned FIXED outside scroll container to eliminate horizontal scroll) */}
      {!isOpen && hoveredTooltip && (
        <div
          style={{ top: `${hoveredTooltip.top}px` }}
          className="fixed left-18 -translate-y-1/2 z-[999] px-3 py-1.5 bg-black dark:bg-slate-800 text-white text-xs font-black rounded-lg shadow-2xl pointer-events-none whitespace-nowrap flex items-center animate-fadeIn"
        >
          <span>{hoveredTooltip.label}</span>
          <div className="w-2 h-2 bg-black dark:bg-slate-800 absolute -left-1 top-1/2 -translate-y-1/2 rotate-45" />
        </div>
      )}

      {/* Sidebar: Full (w-64) or Mini Rail (w-16) - Strictly overflow-x-hidden */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-x-hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? 'w-64 translate-x-0'
            : 'w-16 -translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header: Company Logo (without 'Task System' text) when open, or 3-lines ≡ when collapsed */}
        <div
          className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0 transition-all ${
            isOpen ? 'justify-between px-4' : 'justify-center px-2'
          }`}
        >
          {isOpen ? (
            <>
              <div className="flex items-center min-w-0">
                <img
                  src="/logo/nts_logo.png"
                  alt="NTS Logo"
                  className="h-8 sm:h-9 w-auto max-w-[170px] object-contain shrink-0"
                />
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none cursor-pointer"
                aria-label="Collapse sidebar"
                title="Collapse to icons"
              >
                <X className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="p-2 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none cursor-pointer"
              aria-label="Expand sidebar"
              title="Expand menu"
            >
              <Menu className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Action Button: Add Task */}
        <div className={`pt-4 pb-2 shrink-0 ${isOpen ? 'px-4' : 'px-2 flex justify-center'}`}>
          {isOpen ? (
            <button
              onClick={() => {
                if (onOpenCreateTask) onOpenCreateTask();
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (onOpenCreateTask) onOpenCreateTask();
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              onMouseEnter={(e) => handleMouseEnter(e, 'Add Task')}
              onMouseLeave={handleMouseLeave}
              className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              aria-label="Add Task"
              title="Add Task"
            >
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Navigation List: Strictly overflow-x-hidden, smooth slick vertical scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden slick-scrollbar px-2 py-2 space-y-1.5">


          {navItems.map((item) => {
            if (!item.roles.includes(user?.role || 'employee')) {
              return null;
            }

            const Icon = item.icon;

            return (
              <div key={item.to} className="flex justify-center">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => {
                    if (window.innerWidth < 1024 && onClose) onClose();
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                  onMouseLeave={handleMouseLeave}
                  title={isOpen ? undefined : item.label}
                  className={({ isActive }) =>
                    isOpen
                      ? `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white border-l-4 border-brand-600 shadow-xs'
                            : 'text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
                        }`
                      : `w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white border-l-2 border-brand-600 shadow-xs'
                            : 'text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
                        }`
                  }
                >
                  <Icon className={`${isOpen ? 'w-4 h-4' : 'w-5 h-5'} shrink-0 text-black dark:text-white stroke-[2.2]`} />
                  {isOpen && <span className="text-black dark:text-white truncate">{item.label}</span>}
                </NavLink>
              </div>
            );
          })}
        </div>

        {/* Bottom User Profile Section: Full or Mini with hover popup */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 overflow-x-hidden">
          {isOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase border border-transparent dark:border-slate-700">
                  {employeeName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-black dark:text-white truncate">{employeeName}</p>
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-400 truncate">{employeeRole}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-black dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                onMouseEnter={(e) => handleMouseEnter(e, `${employeeName} (${employeeRole})`)}
                onMouseLeave={handleMouseLeave}
                className="w-8 h-8 rounded-lg bg-black dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center uppercase shrink-0 border border-transparent dark:border-slate-700 cursor-pointer"
                title={`${employeeName} (${employeeRole})`}
              >
                {employeeName.charAt(0)}
              </div>

              <button
                onClick={logout}
                onMouseEnter={(e) => handleMouseEnter(e, 'Sign Out')}
                onMouseLeave={handleMouseLeave}
                className="p-1.5 text-black dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
