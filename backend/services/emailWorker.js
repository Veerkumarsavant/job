// services/emailWorker.js
const { Worker } = require("bullmq");
const redis = require("../config/redis");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

new Worker("emailQueue", async job => {
  const { email, otp } = job.data;

  await transporter.sendMail({
    to: email,
    subject: "OTP Code",
    html: `<h2>Your OTP: ${otp}</h2>`
  });

}, { connection: redis });