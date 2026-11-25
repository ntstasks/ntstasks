const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sendPasswordResetOtp } = require('../utils/emailService');

async function test() {
  const targetEmail = process.argv[2] || process.env.SENDER_MAIL || 'info@neuraltechsoft.com';
  console.log(`Starting OTP send test via emailjs to: ${targetEmail}`);
  const startTime = Date.now();
  
  try {
    const info = await sendPasswordResetOtp({
      to: targetEmail,
      otp: '782914',
      userName: 'Test User'
    });
    const elapsed = Date.now() - startTime;
    console.log(`✅ Success! Sent via emailjs in ${elapsed} ms (${(elapsed / 1000).toFixed(2)} seconds).`);
    console.log(`Header:`, info.header);
  } catch (error) {
    console.error(`❌ Failed:`, error);
  }
}

test();
