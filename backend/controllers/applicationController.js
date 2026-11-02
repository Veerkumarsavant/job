const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");

const applyJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId)
      .select("createdBy title")
      .lean();

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const existing = await Application.findOne({
      job: jobId,
      applicant: userId
    });

    if (existing) {
      return res.status(400).json({ message: "Already applied" });
    }

    const application = await Application.create({
      job: jobId,
      applicant: userId,
      status: "applied"
    });

    const populated = await Application.findById(application._id)
      .populate("applicant", "name email avatar headline resume")
      .lean();

    const io = req.app.get("io");

    const payload = {
      _id: populated._id,
      applicant: populated.applicant,
      status: populated.status,
      job: jobId
    };

    io.to(job.createdBy.toString()).emit("newApplicant", payload);
    io.to(`job_${jobId}`).emit("newApplicant", payload);
    io.to(userId.toString()).emit("applicationSubmitted", {
      jobId,
      status: "applied"
    });



    res.json(populated);

  } catch (err) {
    console.error("APPLY ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: "Already applied" });
    }

    res.status(500).json({ message: "Application failed" });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({ applicant: req.user.id })
      .populate("job", "title company location")
      .sort({ createdAt: -1 })
      .lean();

    res.json(apps);

  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

const getApplicationsForRecruiter = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user.id }).select("_id");

    const jobIds = jobs.map(j => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate(
  "applicant",
  "name email avatar headline resume"
)
      .populate("job", "title company location")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });

  } catch (err) {
    console.error("RECRUITER ERROR:", err);
    res.status(500).json({ message: "Failed to fetch recruiter applications" });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    if (
  ![
    "applied",
    "shortlisted",
    "accepted",
    "rejected"
  ].includes(status)
) {

  return res.status(400).json({
    message: "Invalid status"
  });

}

    const application = await Application
      .findById(id)
      .populate("job", "createdBy title")
      .populate(
  "applicant",
  "name email avatar headline resume"
)
      .lean();

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!application.job || !application.job.createdBy) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (application.job.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const updated = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("applicant", "name email avatar headline resume")
      .populate("job", "title createdBy")
      .lean();

    const io = req.app.get("io");


    const payload = {
      _id: updated._id,
      status: updated.status,
      applicant: updated.applicant,
      job: updated.job
    };


    io.to(updated.applicant._id.toString()).emit("applicationStatusUpdated", payload);

    io.to(updated.job.createdBy.toString()).emit("applicationStatusUpdated", payload);

    io.to(`job_${updated.job._id}`).emit("applicationStatusUpdated", payload);

    res.json(updated);

  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

const getApplicationsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const applications = await Application.find({ job: jobId })
      .populate(
  "applicant",
  "name email avatar headline resume"
)
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.json(applications);

  } catch (err) {
    console.error("GET JOB APPS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  applyJob,
  getMyApplications,
  getApplicationsForRecruiter,
  updateApplicationStatus,
  getApplicationsByJob
};