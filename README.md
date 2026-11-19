# NTS - Employee Task Management & Performance Analytics System

A focused, professional **Employee Task Management & Reporting System** built with **React.js**, **Node.js**, **Express.js**, **Tailwind CSS**, **Recharts**, and **PostgreSQL** (via Sequelize ORM).

---

## 🎯 Core Objectives & Capabilities

1. **Employee Task Workflow**:
   - Employees manage their daily and monthly tasks.
   - Add new tasks with title, description, category, priority, start date, due date, estimated hours, and actual hours.
   - Update task status (`Not Started`, `In Progress`, `On Hold`, `Completed`) and progress percentage (0–100%).
   - Dedicated **Monthly Tasks** view to plan and track monthly deliverables.
   - **Calendar** view to inspect deadlines at a glance.

2. **Admin Monitoring & Reports**:
   - Executive dashboard summarizing total employees, tasks in progress, completed deliverables, overdue milestones, and overall completion rate.
   - Employee roster showing each team member's assigned vs. completed work.
   - Deep-dive employee performance view with date filters (*Today*, *This Week*, *This Month*, *Last Month*, *Custom*).
   - Dedicated **Reports & Export Center** to export live database data directly to **Excel (`.xlsx`)** and **PDF (`.pdf`)**.
   - Department and team allocation.

3. **Clean & Professional UI**:
   - Professional, minimal corporate layout with standard alignment and spacing.
   - Company logo displayed cleanly without background boxes or redundant duplicate text.
   - No unnecessary bloated views or complex kanban clutter.

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin@nts.com` | `Password123!` | Complete administrative authority, task monitoring, employee performance, Excel & PDF reports |
| **Employee** | `alex.morgan@nts.com` | `Password123!` | Personal dashboard, add & manage daily/monthly tasks, calendar schedule |

---

## 🌐 Running Services

| Service | Address |
|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) |
| **PostgreSQL Database** | Connected via `.env` configuration |
