const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    otp: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ["verify_email", "reset_password"],
      default: "verify_email",
      index: true
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      default: "email"
    },
    expiresAt: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    ip: String,
    userAgent: String

  },
  {
    timestamps: true
  }
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ user: 1, purpose: 1, createdAt: -1 });
otpSchema.index(
  { user: 1, purpose: 1, isUsed: 1 },
  { unique: false }
);


module.exports =
  mongoose.models.OTP ||
  mongoose.model("OTP", otpSchema);