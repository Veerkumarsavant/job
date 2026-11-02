const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job"
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  date: Date
}, { timestamps: true });

module.exports = mongoose.model("Interview", interviewSchema);