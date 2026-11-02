const Application = require("../models/Application");
const Job = require("../models/Job");
const { getIO } = require("../socket");

const applyJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }
    const existing = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });
    if (existing) {
      return res.status(400).json({
        message: "You already applied to this job"
      });
    }
    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      resume: req.body.resume,
      status: "applied"
    });
    try {
      const io = getIO();
      if (io) {
        io.emit("analyticsUpdate", {
          type: "newApplicant",
          jobId,
          userId: req.user.id
        });
      }
    } catch (err) {
      console.log("Socket skipped");
    }
    res.json(application);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Application failed"
    });
  }
};
const getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({
      applicant: req.user.id
    })
    .populate("job", "title company location")
    .sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch applications"
    });
  }
};
const getApplicationsForRecruiter = async (req, res) => {
  try {
    const jobs = await Job.find({
      recruiter: req.user.id
    }).select("_id");
    const jobIds = jobs.map(j => j._id);
    const applications = await Application.find({
      job: { $in: jobIds }
    })
    .populate("applicant", "name email")
    .populate("job", "title company location")
    .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch recruiter applications"
    });
  }
};
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }
    const application = await Application
      .findById(id)
      .populate("job");
    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }
    if (application.job.recruiter.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }
    application.status = status;
    await application.save();
    try {
      const io = getIO();
      if (io) {
        io.emit("applicationStatusUpdated", {
          applicationId: id,
          status
        });
      }
    } catch {}
    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Update failed"
    });
  }
};
;

module.exports = {
  applyJob,
  getMyApplications,
  getApplicationsForRecruiter,
  updateApplicationStatus
};