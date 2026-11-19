// Enforce Indian Standard Time (GMT+5:30) globally
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { formatISTDateTime } = require('./utils/dateUtils');

// Attempt loading .env from root, backend, or current working directory
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env')
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}
require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

// Keep-Alive Service to prevent Render Free instances from sleeping
function initKeepAlive() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '5', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  if (!externalUrl) {
    console.log(`[Keep-Alive] Running in local/custom mode. In Render, RENDER_EXTERNAL_URL is auto-detected. (Optional: Set KEEP_ALIVE_URL in .env to enable self-ping).`);
    return;
  }

  const pingUrl = `${externalUrl.replace(/\/$/, '')}/api/health`;
  console.log(`[Keep-Alive] Initialized: Self-pinging ${pingUrl} every ${intervalMinutes} minutes (${formatISTDateTime()}).`);

  // Initial ping 1 minute after startup
  setTimeout(() => {
    pingTarget(pingUrl);
  }, 60 * 1000);

  // Recurring ping interval
  setInterval(() => {
    pingTarget(pingUrl);
  }, intervalMs);
}

function pingTarget(url) {
  try {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      console.log(`[Keep-Alive Ping] ${url} -> HTTP ${res.statusCode} at ${formatISTDateTime()}`);
    });
    req.on('error', (err) => {
      console.warn(`[Keep-Alive Ping Warning] ${err.message} at ${formatISTDateTime()}`);
    });
    req.setTimeout(15000, () => {
      req.destroy();
      console.warn(`[Keep-Alive Ping Timeout] at ${formatISTDateTime()}`);
    });
  } catch (err) {
    console.warn(`[Keep-Alive Ping Error] ${err.message}`);
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log(`PostgreSQL database connected successfully. Current Server Time: ${formatISTDateTime()}`);

    app.listen(PORT, () => {
      console.log(`NTS Task Management Server is running on port ${PORT} [Timezone: GMT+5:30 Asia/Kolkata]`);
      initKeepAlive();
    });
  } catch (error) {
    console.error('Fatal: Unable to connect to database or start server:', error);
    process.exit(1);
  }
}

startServer();

