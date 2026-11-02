const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ALLOWED_APPLICATION_STATUSES = ["applied","accepted","rejected","shortlisted"];

const getRecruiterDashboard = async (req, res) => {
  res.json({success: true,message: "Recruiter dashboard working"});
};

const getRecruiterStats = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const recruiterJobs = await Job.find({createdBy: recruiterId}).select("_id").lean();
    const jobs = recruiterJobs.length;
    const jobIds = recruiterJobs.map(job => job._id);
    const applicants =
      await Application.countDocuments({
        job: { $in: jobIds }
      });

    const interviews =await Application.countDocuments({
        job: { $in: jobIds },
        status: "shortlisted"
      });

    res.json({success: true,jobs,applicants,interviews});
  } catch (err) {

    console.error("Stats error:",err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats"
    });
  }
};

const getRecruiterProfile = async (req, res) => {
  try {
    const recruiter = await User.findById(req.user.id).select("-password").lean();
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found"
      });
    }
    res.json({success: true,data: recruiter});
  } catch (error) {
    console.error("Profile error:",error);
    res.status(500).json({success: false,message: "Server error"});
  }
};

const updateRecruiterProfile = async (req,res) => {
  try {
    const {companyName,industry,location,website,about} = req.body;
    if (!companyName && !industry && !location && !website &&!about) {
      return res.status(400).json({
        success: false,
        message: "No data provided"
      });

    }

    const updateData = {};

    if (companyName !== undefined)
      updateData.companyName = companyName;

    if (industry !== undefined)
      updateData.industry = industry;

    if (location !== undefined)
      updateData.location = location;

    if (website !== undefined)
      updateData.website = website;

    if (about !== undefined)
      updateData.about = about;

    const recruiter =await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: updateData
        },
        {
          new: true,
          runValidators: true
        }
      ).select("-password").lean();

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found"
      });

    }

    res.json({success: true,data: recruiter});
  } catch (err) {
    console.error("Update profile error:",err);
    res.status(500).json({success: false,message: "Failed to update profile"});
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });

    }

    const allowed = ["image/png","image/jpeg","image/webp"];

    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type"
      });
    }

    if (
      req.file.size >
      2 * 1024 * 1024
    ) {

      return res.status(400).json({
        success: false,
        message: "Image too large"
      });

    }

    const filePath ="/uploads/logos/" +req.file.filename;
    await User.findByIdAndUpdate(req.user.id,
      {
        logo: filePath
      },
      {
        new: true
      }
    );

    res.json({
      success: true,
      logo: filePath
    });

  } catch (err) {
    console.error("Upload logo error:",err);
    res.status(500).json({
      success: false,
      message: "Upload failed"
    });
  }
};

const getRecruiterApplications =async (req, res) => {
  try {
    const recruiterId =req.user.id;
    const jobs = await Job.find({createdBy: recruiterId}).select("_id").lean();
    const jobIds = jobs.map(job => job._id);
    const applications =await Application.find({job: { $in: jobIds }})
      .populate({
        path: "applicant",
        select: `name email avatar headline resume skills location education projects certificates`,
        options: {
          lean: true
        }
      })
      .populate({
        path: "job",
        select:"title company location salary",
        options: {
          lean: true
        }
      })
      .sort({
        createdAt: -1
      })
      .lean();

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });

  } catch (err) {
    console.error(
      "Recruiter applications error:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to load applications"
    });

  }

};

const updateApplicationStatus =async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });

    }

    if (
      !ALLOWED_APPLICATION_STATUSES.includes(
        status
      )
    ) {

      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });

    }

    const application =await Application.findById(req.params.id).populate({
  path: "applicant",
  select: `
    name
    email
    avatar
    headline
    resume
    skills
    location
    education
  `,
  options: { lean: true }
})
      .populate({
        path: "job",
        select:"title company location salary",
        options: {
          lean: true
        }
      });

    if (!application) {

      return res.status(404).json({
        success: false,
        message:
          "Application not found"
      });

    }

    const job = await Job.findById(application.job._id).select("createdBy").lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });

    }

    if (!job.createdBy) {
      console.error("Job missing createdBy:",job);
      return res.status(400).json({
        success: false,
        message:"Job owner missing"
      });

    }

    if (job.createdBy.toString() !==req.user.id) {

      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });

    }

    if (
      application.status === status
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Application already ${status}`
      });

    }

    application.status = status;
    await application.save();
    const statusMessages = {
      accepted:`Congratulations! Your application for "${application.job.title}" was accepted.`,
      rejected:`Your application for "${application.job.title}" was rejected.`,
      shortlisted:`You have been shortlisted for "${application.job.title}".`
    };

    const notificationMessage =statusMessages[status] ||`Application updated to ${status}`;
    await Notification.create({
      user:application.applicant._id,
      type:"application_status",
      message:notificationMessage,
      createdAt:new Date()
    });

    const io =req.app.get("io");
    if (io) {
      io.to(application.applicant._id.toString()
      ).emit(
        "applicationUpdated",
        {
          _id: application._id,
          status: application.status,
          job:application.job
        }
      );

      io.to(
        application.applicant._id.toString()
      ).emit(
        "newNotification",
        {
          type:
            "application_status",

          message:
            notificationMessage
        }
      );

      io.to(req.user.id).emit(
        "recruiterApplicationUpdated",
        {
          _id:application._id,
          status:application.status,
          applicant:application.applicant,
          job:application.job
        }
      );

    }

    res.json({
      success: true,
      message:
        "Application updated successfully",
      data: application
    });

  } catch (err) {

    console.error(
      "Update application status error:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update application"
    });

  }

};

const getApplicationAnalytics =async (req, res) => {
  try {
    const recruiterId =req.user.id;
    const jobs = await Job.find({createdBy: recruiterId})
    .select("_id")
    .lean();

    const jobIds = jobs.map(job => job._id);
    if (!jobIds.length) {
      return res.json({
        success: true,
        analytics: {
          applied: 0,
          accepted: 0,
          rejected: 0,
          shortlisted: 0
        },
        generatedAt: new Date()
      });

    }

    const analytics =await Application.aggregate([
        {
          $match: {
            job: {
              $in: jobIds
            }
          }
        },
        {
          $group: {
            _id: "$status",
            total: {
              $sum: 1
            }
          }
        }
      ]);

    const formatted = {applied: 0,accepted: 0,rejected: 0,shortlisted: 0};
    analytics.forEach(item => {
      formatted[item._id] =
        item.total;
    });
    const total =formatted.applied +formatted.shortlisted +formatted.accepted +formatted.rejected;

res.json({
  success: true,
  analytics: formatted,
  acceptRate:
    total > 0
      ? Math.round(
          (formatted.accepted * 100) /
          total
        )
      : 0,
  generatedAt: new Date()
});

  } catch (err) {
    console.error("Analytics error:",err);
    res.status(500).json({
      success: false,
      message:
        "Failed to load analytics"
    });
  }
};

module.exports = {
  getRecruiterDashboard,
  getRecruiterStats,
  getRecruiterProfile,
  updateRecruiterProfile,
  uploadLogo,
  getRecruiterApplications,
  updateApplicationStatus,
  getApplicationAnalytics
};