const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    title: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      trim: true,
      default: ""
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    location: {
      type: String,
      trim: true,
      default: ""
    },

    linkedin: {
      type: String,
      default: ""
    },

    github: {
      type: String,
      default: ""
    },

    summary: {
      type: String,
      default: ""
    },

    aiSummary: {
      type: String,
      default: ""
    },

    skills: {
      type: [String],
      default: []
    },

    experience: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    projects: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    certifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    profileImage: {
      type: String,
      default: ""
    },

    resumeFile: {
      path: {
        type: String,
        default: ""
      },
      originalName: {
        type: String,
        default: ""
      },
      uploadedAt: {
        type: Date
      }
    },

    versions: {
      type: [
        {
          name: { type: String, default: "" },
          title: { type: String, default: "" },
          summary: { type: String, default: "" },
          aiSummary: { type: String, default: "" },
          skills: { type: [String], default: [] },
          experience: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
          },
          education: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
          },
          projects: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
          },
          certifications: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
          },
          atsScore: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },

    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    aiSuggestions: {
      type: [String],
      default: []
    },

    isPublic: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce one resume document per user.
resumeSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model("Resume", resumeSchema);