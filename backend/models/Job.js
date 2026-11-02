const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: [
        "applied",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired"
      ],
      default: "applied"
    },

    appliedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    company: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: [
        "remote",
        "fulltime",
        "parttime",
        "internship"
      ],
      default: "fulltime"
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    role: {
      type: String,
      trim: true,
      default: ""
    },

    skills: [
      {
        type: String,
        trim: true
      }
    ],

    salary: {
      min: {
        type: Number,
        default: 0,
        min: 0
      },

      max: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    experience: {
      type: String,
      default: "0-2"
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active"
    },

    applications: [applicationSchema]
  },
  {
    timestamps: true
  }
);

jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ createdBy: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ status: 1 });

module.exports = mongoose.model("Job", jobSchema);