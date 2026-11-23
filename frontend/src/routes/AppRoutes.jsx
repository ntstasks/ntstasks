import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';
import EmployeeDetailedPerformance from '../pages/admin/EmployeeDetailedPerformance';
import EmployeesManagement from '../pages/admin/EmployeesManagement';
import AdminsManagement from '../pages/admin/AdminsManagement';
import TeamOverview from '../pages/admin/TeamOverview';
import Reports from '../pages/admin/Reports';
import TaskList from '../pages/TaskList';
import MonthlyPlanner from '../pages/MonthlyPlanner';
import CalendarView from '../pages/CalendarView';
import NotificationsPage from '../pages/NotificationsPage';
import Settings from '../pages/Settings';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Role-adaptive Home Dashboard
const DashboardSwitcher = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />

      {/* Protected Workspace Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Home Dashboard */}
        <Route index element={<DashboardSwitcher />} />

        {/* Task Management (Reorganized: centralized in Monthly Tasks) */}
        <Route path="tasks" element={<Navigate to="/monthly-planner" replace />} />
        <Route path="monthly-planner" element={<MonthlyPlanner />} />
        <Route path="calendar" element={<Navigate to="/monthly-planner" replace />} />

        {/* Admin Exclusive Routes */}
        <Route
          path="employees"
          element={
            <ProtectedRoute requiredRole="admin">
              <EmployeesManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admins"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminsManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="employees/:id/performance"
          element={
            <ProtectedRoute>
              <EmployeeDetailedPerformance />
            </ProtectedRoute>
          }
        />
        <Route
          path="performance/:id"
          element={
            <ProtectedRoute>
              <EmployeeDetailedPerformance />
            </ProtectedRoute>
          }
        />
        <Route path="performance" element={<Navigate to="/" replace />} />
        <Route path="team-overview" element={<Navigate to="/employees" replace />} />
        <Route
          path="reports"
          element={<Navigate to="/employees" replace />}
        />

        {/* General Routes */}
        <Route path="notifications" element={<Navigate to="/" replace />} />
        <Route path="settings" element={<Navigate to="/" replace />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
