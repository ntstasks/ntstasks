# NTS - Employee Task Management & Performance Analytics System

A modern, streamlined **Employee Task Management & Reporting System** built with **React.js**, **Node.js**, **Express.js**, **Tailwind CSS**, **Recharts**, and **PostgreSQL** (via Sequelize ORM).

The system provides a unified, distraction-free experience across two distinct panels:
- **Employee Panel**: Personal task tracking, monthly deliverables, direct task editing, and secure OTP-based password recovery.
- **Admin Panel**: Team-wide monitoring, monthly task management with employee filtering, in-depth performance analytics, and integrated Excel/PDF report exports.

---

## 🎯 Key Features & System Architecture

### 1. Employee Panel
- **Employee Dashboard**:
  - Key performance indicators: *Assigned*, *Completed*, *In Progress*, *Overdue*, and *Completion Rate (%)*.
  - Weekly task completion activity chart powered by Recharts.
  - Recent tasks view with direct edit capability.
- **Monthly Tasks (Monthly Planner)**:
  - Full view of monthly task deliverables with month/year navigation (`YYYY-MM`).
  - Tasks categorized by priority (*Low*, *Medium*, *High*, *Urgent*) and status (*Not Started*, *In Progress*, *On Hold*, *Completed*).
  - Quick status updates and carry-forward actions for ongoing tasks.
- **Task Management**:
  - **Create Task**: Clean form with title, description, department, priority, start date, and deadline. (Progress is handled automatically with safe defaults).
  - **Direct Task Editing**: Clean modal editor allowing employees and admins to modify task details without heavy chat or file-sharing clutter.
- **Clean Navigation & Layout**:
  - Distraction-free sidebar and header layout.
  - Redundant separate "My Tasks" and "Calendar" views are safely consolidated into **Monthly Tasks**.
  - Notification icon and badges removed for a focused, clean header bar.

### 2. Admin Panel
- **Executive Admin Dashboard**:
  - High-level metrics: total employees, ongoing tasks, completed milestones, overdue alerts, and organizational completion rate.
  - Departmental workload breakdown and 6-month completion trend line charts.
  - Employee roster with quick links to detailed performance profiles.
- **Monthly Tasks with Dynamic Employee Filter**:
  - View all organization tasks for any selected month.
  - **Employee-Wise Filter Dropdown**: Easily toggle between **All Employees** or a specific employee to inspect individual workloads.
  - Reset filters, month switching, and empty-state messaging.
  - Direct task editing and carry-forward capabilities.
- **Employees Management & Integrated Reports**:
  - Clean employee table showing full name, designation, department, system role, active status, contact info, and actions.
  - Visual Employee IDs removed from UI tables and forms for a clean human-centric design (preserved internally for database relationships).
  - **[Export Report] Button**: Integrated directly on the Employees page next to *Add New Employee*.
  - **Export Report Modal**: Filter reports by Employee (*All* or specific), Department, Task Status, Date Range, or Target Month, with instant download in:
    - **Excel (`.xlsx`)**: Structured, multi-sheet/formatted spreadsheet.
    - **PDF (`.pdf`)**: Formatted executive report document with task tables and summary stats.
- **Employee Performance Analytics**:
  - Detailed individual metrics: efficiency ratio, estimated vs. actual hours, completion rates, and weekly activity.
  - Full assigned tasks breakdown with direct task editing.
- **Administrators Management**:
  - Dedicated administrator roster to manage admin accounts, status, and department oversight.
- **Simplified Settings**:
  - Clean settings page focused strictly on user preferences and profile information.

### 3. Secure Mailbox OTP Password Recovery
- **Company Roster Pre-Verification**: Before generating an OTP, the system verifies that the employee exists in the company roster with an active employee profile. Deactivated or unknown emails are rejected immediately.
- **Cryptographic OTP Generation**: Generates a secure 6-digit numeric code with a 10-minute validity window.
- **One-Way SHA-256 Hashing**: Plaintext OTPs are never stored in the database. Only one-way SHA-256 hashes are recorded in `users.reset_token`.
- **Direct Native SMTP via `emailjs`**: Sends responsive, branded HTML emails through direct SSL (port 465) to `smtp.gmail.com` using the configured company email (`info@neuraltechsoft.com`).
- **Strict Mailbox Security**: The OTP is sent exclusively to the employee's private mailbox and is never exposed in API responses or on-screen without email verification.
- **Single-Use Token Wiping**: The token and expiration timestamp are immediately wiped (`NULL`) upon successful password reset, preventing replay attacks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide React Icons, Recharts, Axios, React Router DOM v7 |
| **Backend** | Node.js (>=18), Express.js 4, Sequelize ORM 6, PostgreSQL (`pg`), JWT, Bcryptjs |
| **Email Service** | `emailjs` (native direct SSL SMTP connection via port 465 to `smtp.gmail.com`) |
| **Reporting** | ExcelJS (backend Excel generation), PDFKit & PDFKit-Table (backend PDF generation), jsPDF & XLSX (frontend fallback) |
| **Database** | PostgreSQL (supports local PostgreSQL or cloud AWS RDS PostgreSQL with SSL) |
| **Timezone** | Global Indian Standard Time (`Asia/Kolkata`, GMT+5:30) |

---

## 📁 Project Directory Structure

```plaintext
ntstask/
├── backend/
│   ├── config/             # Sequelize database configuration (database.js)
│   ├── controllers/        # REST API controllers (auth, tasks, employees, analytics, reports)
│   ├── middleware/         # Auth (JWT) and Multer file upload middlewares
│   ├── models/             # Sequelize data models (User, Employee, Task, Department, etc.)
│   ├── routes/             # Express API routes (/api/auth, /api/tasks, /api/employees, etc.)
│   ├── scripts/            # Database inspection, test scripts, and migrations
│   │   ├── test_send_otp_mail.js # CLI tool to test emailjs OTP delivery
│   │   ├── test_otp_db.js        # CLI tool to inspect user tokens and expiry in DB
│   │   ├── seed_admin.js         # Initial administrator setup
│   │   └── inspect_db_data.js    # Database inventory and health check
│   ├── utils/              # emailService.js (emailjs SMTP), dateUtils.js (IST), activityLogger.js
│   ├── app.js              # Express app initialization, CORS, and SPA routing
│   ├── server.js           # Server entry point with Render keep-alive self-ping
│   └── package.json        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── assets/         # Static images, branding logos
│   │   ├── components/     # Reusable UI components (TaskModal, CarryForwardModal, ExportReportModal)
│   │   ├── context/        # AuthContext, ThemeContext, ToastContext
│   │   ├── hooks/          # useBodyScrollLock hook
│   │   ├── layouts/        # MainLayout, Navbar, Sidebar
│   │   ├── pages/          # AdminDashboard, EmployeeDashboard, MonthlyPlanner, Login, Settings
│   │   ├── routes/         # AppRoutes with role-based route protection
│   │   ├── services/       # api.js (Axios client with interceptors)
│   │   └── utils/          # Status and priority badge helpers
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite build configuration
├── .env.example            # Environment configuration template
├── package.json            # Root workspace scripts
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** instance (local or hosted like AWS RDS)

### 2. Environment Setup
Copy the environment template to `.env` in the root directory:
```bash
cp .env.example .env
```

Configure your database, JWT, and email credentials in `.env`:
```env
# Database Configuration (PostgreSQL / AWS RDS)
PSQL_HOST=your-postgres-host
PSQL_PORT=5432
PSQL_DATABASE=ntstasks
PSQL_USERNAME=postgres
PSQL_PASSWORD=your_password
PSQL_SSLMODE=require

# Application Settings
NODE_ENV=development
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
TZ=Asia/Kolkata

# Mail / OTP Configuration (emailjs SMTP)
SENDER_MAIL=info@neuraltechsoft.com
SENDER_PASSWORD=your_app_password_here

# Render Keep-Alive Configuration
KEEP_ALIVE_INTERVAL_MINUTES=5
```

### 3. Installation
Install all dependencies for both backend and frontend in one step:
```bash
npm run install:all
```

### 4. Running in Development Mode
Run the backend API and frontend Vite dev server concurrently:

```bash
# Terminal 1 - Start Backend API (runs on port 5000)
npm run dev:backend

# Terminal 2 - Start Frontend Dev Server (runs on port 5173)
npm run dev:frontend
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 🛠️ Helpful Terminal Utility Scripts

The project includes purpose-built utility scripts in `backend/scripts/`:

```bash
# 1. Test sending live OTP email to any address via emailjs
node backend/scripts/test_send_otp_mail.js your-email@example.com

# 2. Inspect user reset tokens and expiry in PostgreSQL database
node backend/scripts/test_otp_db.js employee@company.com

# 3. View entire database inventory (users, employees, departments, tasks)
node backend/scripts/inspect_db_data.js

# 4. Seed initial default administrator account
npm run db:seed:admin
```

---

## 📡 Core REST API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` – User authentication & JWT issuance (supports `portal: 'employee'` or `'admin'`)
- `POST /api/auth/register` – Register new employee with automatic profile creation
- `GET /api/auth/profile` – Retrieve authenticated session profile
- `PUT /api/auth/profile` – Update user personal profile
- `PUT /api/auth/change-password` – Change password while authenticated
- `POST /api/auth/forgot-password` – Verifies company employee existence, generates 6-digit OTP, and sends email via `emailjs`
- `POST /api/auth/verify-otp` – Validates the 6-digit OTP against unexpired database token
- `POST /api/auth/reset-password` – Verifies OTP and resets account password with immediate token invalidation

### Tasks (`/api/tasks`)
- `GET /api/tasks` – Retrieve filtered tasks (supports month, employee_id, status, priority)
- `GET /api/tasks/:id` – Retrieve complete task details with assignees and department
- `POST /api/tasks` – Create new task
- `PUT /api/tasks/:id` – Update task fields (accessible to admin, creator, or assigned team member)
- `PATCH /api/tasks/:id/status` – Update task status (`not_started`, `in_progress`, `on_hold`, `completed`)
- `POST /api/tasks/carry-forward` – Carry forward incomplete tasks to next month

### Employees (`/api/employees`)
- `GET /api/employees` – List employees with department and status filtering
- `GET /api/employees/:id` – Employee profile details
- `POST /api/employees` – Add employee / admin (auto-generates employee ID if not provided)
- `PUT /api/employees/:id` – Update employee information
- `PATCH /api/employees/:id/toggle-status` – Activate / deactivate employee account

### Reports & Analytics (`/api/reports` & `/api/analytics`)
- `GET /api/reports/excel` – Generate and stream structured Excel (`.xlsx`) task report
- `GET /api/reports/pdf` – Generate and stream formatted PDF (`.pdf`) executive summary
- `GET /api/analytics/admin-dashboard` – Organization-wide KPIs, department workload, and trends
- `GET /api/analytics/employee-dashboard` – Personal employee KPIs and weekly activity
- `GET /api/analytics/employee-performance/:id` – Detailed employee performance analysis

### Health Check (`/api/health`)
- `GET /api/health` – Returns server operational status and current IST timestamp

---

## 🏗️ Production Build & Unified Deployment

To build the React frontend and bundle it into the Node.js production service:

```bash
# Build frontend and install production dependencies
npm run build

# Start production server
npm start
```

The Express server automatically serves the compiled frontend assets from `frontend/dist` and handles single-page application (SPA) routing, making it ready for single-service deployment on platforms like Render, AWS EC2, or Railway.

---

## 🔒 Safety & Data Integrity Standards
- **Strict Existence Checks**: OTPs are only generated for confirmed, active employees in the company roster.
- **Database Safety**: Tables, schemas, and historical task/employee records are protected against destructive resets or unapproved migrations.
- **Timezone Enforcement**: All deadlines, activity logs, and monthly plans are calculated using Indian Standard Time (`Asia/Kolkata`, GMT+5:30).
- **Internal Identifiers**: Primary IDs and employee keys remain active in backend schemas and APIs for relational queries, while user-facing screens display human-friendly names and designations.
