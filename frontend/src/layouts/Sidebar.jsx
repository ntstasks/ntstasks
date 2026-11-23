import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Target,
  Users,
  ShieldCheck,
  Briefcase,
  LogOut,
  X,
  Menu
} from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, onClose, onOpenCreateTask }) => {
  const { user, isAdmin, logout } = useAuth();
  const [hoveredTooltip, setHoveredTooltip] = useState(null); // { label, top }

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
                  className="h-8 sm:h-9 w-auto max-w-[170px] object-contain shrink-0 dark:hidden"
                />
                <img
                  src="/logo/nts_logo_dark.png"
                  alt="NTS Logo"
                  className="h-8 sm:h-9 w-auto max-w-[170px] object-contain shrink-0 hidden dark:block"
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

        {/* Bottom User Area: Only Red Logout Button */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 overflow-x-hidden flex justify-center">
          {isOpen ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={logout}
              onMouseEnter={(e) => handleMouseEnter(e, 'Logout')}
              onMouseLeave={handleMouseLeave}
              className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
