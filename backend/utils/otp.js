// utils/otp.js
const crypto = require("crypto");
const redis = require("../config/redis");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

async function storeOTP(email, otp) {
  const hash = hashOTP(otp);

  await redis.set(
    `otp:${email}`,
    hash,
    "EX", 300 // 5 min expiry
  );
}

async function verifyOTP(email, otp) {
  const stored = await redis.get(`otp:${email}`);
  if (!stored) return false;

  return stored === hashOTP(otp);
}

async function deleteOTP(email) {
  await redis.del(`otp:${email}`);
}

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  deleteOTP
};