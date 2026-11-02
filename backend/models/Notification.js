const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    type: {
      type: String,
      required: true,
      enum: [
        "post_like",
        "post_comment",
        "connection_request",
        "connection_accepted",
        "job_application",
        "job_post",
        "message",
        "system",
        "profile_view"
      ],
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    link: {
      type: String,
      default: "#"
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
      index: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },


    scheduledFor: {
      type: Date,
      default: null
    },

    expiresAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deliveryStatus: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ recipient: 1, priority: 1 });
notificationSchema.index({ recipient: 1, isPinned: -1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);