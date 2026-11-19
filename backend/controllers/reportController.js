const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { Op } = require('sequelize');
const {
  Task,
  Employee,
  Department,
  TaskCategory,
  User,
  TaskAssignment,
  TaskActivityLog
} = require('../models');
const { getISTDateString, formatISTDateTime } = require('../utils/dateUtils');

// Fetch tasks for report generation based on filter criteria
const getFilteredReportData = async (query) => {
  const { report_type = 'all', department_id, employee_id, start_date, end_date, month } = query;

  const taskWhere = {};
  const employeeWhere = {};

  if (report_type === 'completed') {
    taskWhere.status = 'completed';
  } else if (report_type === 'pending') {
    taskWhere.status = { [Op.in]: ['not_started', 'in_progress', 'on_hold'] };
  } else if (report_type === 'overdue') {
    const todayStr = getISTDateString();
    taskWhere.due_date = { [Op.lt]: todayStr };
    taskWhere.status = { [Op.notIn]: ['completed', 'cancelled'] };
  }

  if (month) {
    taskWhere.planned_month = month;
  }

  if (start_date && end_date) {
    taskWhere.due_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    taskWhere.due_date = { [Op.gte]: start_date };
  } else if (end_date) {
    taskWhere.due_date = { [Op.lte]: end_date };
  }

  let requiredEmp = false;
  if (employee_id && employee_id !== 'all') {
    employeeWhere.id = parseInt(employee_id, 10);
    requiredEmp = true;
  }
  if (department_id && department_id !== 'all') {
    employeeWhere.department_id = parseInt(department_id, 10);
    requiredEmp = true;
  }

  const tasks = await Task.findAll({
    where: taskWhere,
    include: [
      { model: TaskCategory, as: 'category', attributes: ['name'] },
      {
        model: Employee,
        as: 'assigned_employees',
        where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
        required: requiredEmp,
        through: { attributes: [] },
        include: [{ model: Department, as: 'department', attributes: ['name'] }]
      }
    ],
    order: [['due_date', 'ASC']]
  });

  return tasks;
};

// EXPORT TO EXCEL
const exportExcelReport = async (req, res) => {
  try {
    const tasks = await getFilteredReportData(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NTS Task Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Task Report');

    // Title Block
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'NTS Enterprise - Employee Task & Performance Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Corporate dark blue
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    // Subtitle
    worksheet.mergeCells('A2:J2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Generated on: ${formatISTDateTime()} | Total Records: ${tasks.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank row

    // Table Headers
    const headers = [
      'Task ID',
      'Title',
      'Category',
      'Assigned Employee(s)',
      'Department',
      'Priority',
      'Status',
      'Progress',
      'Due Date',
      'Actual / Est Hours'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' } // Brand blue
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Populate Data
    tasks.forEach((t, idx) => {
      const assignees = t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned';
      const departments = t.assigned_employees?.map((e) => e.department?.name).filter(Boolean).join(', ') || 'N/A';
      const hoursStr = `${t.actual_hours || 0} / ${t.estimated_hours || 0} hrs`;

      const row = worksheet.addRow([
        `TSK-${String(t.id).padStart(4, '0')}`,
        t.title,
        t.category?.name || 'General',
        assignees,
        departments,
        t.priority.toUpperCase(),
        t.status.replace('_', ' ').toUpperCase(),
        `${t.progress}%`,
        t.due_date || 'None',
        hoursStr
      ]);

      row.height = 22;
      // Alternating row background
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        });
      }

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Auto-fit column widths
    worksheet.columns.forEach((col, idx) => {
      let maxLen = headers[idx] ? headers[idx].length : 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        if (val.length > maxLen) maxLen = Math.min(val.length, 45);
      });
      col.width = maxLen + 4;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=NTS_Task_Report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    return res.status(500).json({ message: 'Failed to generate Excel report: ' + error.message });
  }
};

// EXPORT TO PDF
const exportPdfReport = async (req, res) => {
  try {
    const tasks = await getFilteredReportData(req.query);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NTS_Task_Report_${Date.now()}.pdf`);

    doc.pipe(res);

    // Header styling
    doc.fillColor('#1E40AF').fontSize(18).text('NTS Enterprise - Employee Task Report', { align: 'left' });
    doc.fillColor('#64748B').fontSize(10).text(`Generated on: ${formatISTDateTime()} | Total tasks: ${tasks.length}`, { align: 'left' });
    doc.moveDown(1.5);

    // Build Table
    const tableData = {
      headers: [
        { label: 'Task ID', property: 'id', width: 60, renderer: null },
        { label: 'Title', property: 'title', width: 180, renderer: null },
        { label: 'Category', property: 'category', width: 85, renderer: null },
        { label: 'Assigned To', property: 'assignees', width: 130, renderer: null },
        { label: 'Priority', property: 'priority', width: 65, renderer: null },
        { label: 'Status', property: 'status', width: 85, renderer: null },
        { label: 'Progress', property: 'progress', width: 60, renderer: null },
        { label: 'Due Date', property: 'due_date', width: 75, renderer: null }
      ],
      datas: tasks.map((t) => ({
        id: `TSK-${String(t.id).padStart(4, '0')}`,
        title: t.title.substring(0, 40),
        category: t.category?.name || 'General',
        assignees: t.assigned_employees?.map((e) => `${e.first_name} ${e.last_name}`).join(', ') || 'Unassigned',
        priority: t.priority.toUpperCase(),
        status: t.status.replace('_', ' ').toUpperCase(),
        progress: `${t.progress}%`,
        due_date: t.due_date || 'N/A'
      }))
    };

    doc.table(tableData, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B'),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font('Helvetica').fontSize(8).fillColor('#334155');
      }
    });

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate PDF report: ' + error.message });
  }
};

module.exports = {
  exportExcelReport,
  exportPdfReport
};

