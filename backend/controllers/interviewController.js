const Interview = require("../models/Interview");
const User = require("../models/User");
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const { sendInterviewEmail } = require("../services/emailService");
const mongoose = require("mongoose");

const createInterview = async (req, res) => {
  try {
    const { jobId, candidateId, date } = req.body;
    if (!mongoose.Types.ObjectId.isValid(jobId) ||
        !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ message: "Invalid date" });
    }
    if (new Date(date) < new Date()) {
      return res.status(400).json({ message: "Cannot schedule in past" });
    }
    const job = await Job.findById(jobId);
    const candidate = await User.findById(candidateId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const interview = await Interview.create({
      job: jobId,
      candidate: candidateId,
      recruiter: req.user.id,
      date
    });
    await Notification.create({
      recipient: candidateId,
      sender: req.user.id,
      type: "job_application",
      message: `Interview scheduled for ${job.title}`,
      link: "/pages/interviews.html"
    });
    try {
      await sendInterviewEmail(candidate.email, candidate.name, job.title, date);
    } catch (err) {
      console.warn("Email failed:", err.message);
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("interviewScheduled", {
        jobId,
        candidateId,
        date
      });
    }
    res.json({
      message: "Interview scheduled successfully",
      interview
    });
  } catch (err) {
    console.error("INTERVIEW ERROR:", err);
    res.status(500).json({ message: "Failed to schedule interview" });
  }
};
const getInterviews = async (req, res) => {
  try {

    const interviews = await Interview.find({
      recruiter: req.user.id
    })
    .populate("job", "title")
    .populate("candidate", "name email")
    .sort({ date: 1 });

    res.json(interviews);

  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch interviews" });
  }
};

module.exports = {
  createInterview,
  getInterviews
};
