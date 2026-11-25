// NTS Task Management - Timezone & Date Utilities (GMT+5:30 / Asia/Kolkata)

const TIMEZONE = 'Asia/Kolkata';

// Set system TZ to Indian Standard Time
process.env.TZ = TIMEZONE;

/**
 * Returns a date formatted in YYYY-MM-DD in Asia/Kolkata timezone (GMT+5:30)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-11-16"
 */
function getISTDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
}

/**
 * Returns month formatted in YYYY-MM in Asia/Kolkata timezone (GMT+5:30)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-11"
 */
function getISTMonthString(date = new Date()) {
  const dateStr = getISTDateString(date);
  return dateStr.substring(0, 7);
}

/**
 * Returns current Date object in IST
 * @returns {Date}
 */
function getNowIST() {
  return new Date();
}

/**
 * Formats a Date to a human-readable Indian Standard Time string
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "16 Nov 2026, 3:30:00 pm IST"
 */
function formatISTDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'medium'
  }) + ' IST';
}

module.exports = {
  TIMEZONE,
  getISTDateString,
  getISTMonthString,
  getNowIST,
  formatISTDateTime
};
