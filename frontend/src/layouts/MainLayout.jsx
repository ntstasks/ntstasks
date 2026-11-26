import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import TaskModal from '../components/tasks/TaskModal';

const MainLayout = () => {
  // Sidebar state: open by default on desktop (>=1024px), closed on mobile/tablet (<1024px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex w-full max-w-full overflow-x-hidden transition-colors duration-200">
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setIsSidebarOpen(false)}
        onOpenCreateTask={() => setIsTaskModalOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-16'
        }`}
      >
        <Navbar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          onOpenCreateTask={() => setIsTaskModalOpen(true)}
        />

        {/* Full width container spanning whole screen without horizontal overflow */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 w-full max-w-full overflow-x-hidden">
          <Outlet context={{ openCreateTask: () => setIsTaskModalOpen(true) }} />
        </main>
      </div>

      {/* Global Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskSaved={() => {
          window.dispatchEvent(new CustomEvent('nts:task-saved'));
        }}
      />
    </div>
  );
};

export default MainLayout;
