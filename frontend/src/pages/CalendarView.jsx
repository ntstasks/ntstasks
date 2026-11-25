import React, { useState, useEffect } from 'react';
import { taskApi } from '../services/api';
import { getPriorityBadge, getStatusBadge } from '../utils/statusBadges';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTitle = currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Fetch tasks for current month view (including boundary dates)
  const fetchMonthTasks = async () => {
    setLoading(true);
    try {
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      const res = await taskApi.getTasks({
        start_date: firstDayOfMonth.toISOString().split('T')[0],
        end_date: lastDayOfMonth.toISOString().split('T')[0],
        limit: 200
      });

      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load calendar tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthTasks();
  }, [currentDate]);

  // Build Calendar Matrix
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: 'prev',
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({
      day: i,
      month: 'current',
      dateStr: dStr
    });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const nextM = month + 2 > 12 ? 1 : month + 2;
    const nextY = month + 2 > 12 ? year + 1 : year;
    calendarDays.push({
      day: i,
      month: 'next',
      dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Calendar Header */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-black dark:text-white stroke-[2.2]" />
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">Interactive Task Calendar</h2>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-400 font-bold">
            Visualize deadlines, identify overdue tasks, and track approaching milestones
          </p>
        </div>

        {/* Navigation & Today Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={today}
            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            Today
          </button>

          <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200 shadow-inner">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-xs font-bold text-slate-900 min-w-[130px] text-center">
              {monthTitle}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full">
        <div className="table-scroll-container slick-scrollbar overflow-x-auto">
          <div className="min-w-[640px] sm:min-w-0">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-300 text-center text-xs font-black text-black uppercase tracking-wider bg-slate-100 py-3">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* 6 Weeks Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.dateStr === todayStr;
                const isCurrentMonth = cell.month === 'current';

                // Find tasks due on this day
                const dayTasks = tasks.filter((t) => t.due_date === cell.dateStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors ${
                      !isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Cell Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? 'bg-brand-600 text-white shadow-sm'
                            : isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      )}
                    </div>

                    {/* Tasks Pills Inside Day Cell */}
                    <div className="space-y-1 mt-1 overflow-hidden flex-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold truncate cursor-pointer transition-all shadow-xs flex items-center gap-1 ${
                            task.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : task.is_overdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : task.priority === 'critical'
                              ? 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                              : task.priority === 'high'
                              ? 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
                              : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                          }`}
                          title={`${task.title} (${task.status.replace('_', ' ')})`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}

                      {dayTasks.length > 3 && (
                        <span className="text-[9px] font-bold text-slate-400 block px-1">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={Boolean(selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => fetchMonthTasks()}
        />
      )}
    </div>
  );
};

export default CalendarView;

