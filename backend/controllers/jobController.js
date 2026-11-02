const Job = require("../models/Job");
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const createJob = async (req, res) => {
  try {

    if (!req.body.title?.trim()) {
      return res.status(400).json({
        message: "Title is required"
      });
    }

    if (!req.body.company?.trim()) {
      return res.status(400).json({
        message: "Company is required"
      });
    }

    if (!req.body.location?.trim()) {
      return res.status(400).json({
        message: "Location is required"
      });
    }

    const salaryMin = Number(
      req.body.salaryMin ??
      req.body.salary?.min
    ) || 0;

    const salaryMax = Number(
      req.body.salaryMax ??
      req.body.salary?.max
    ) || 0;

    if (salaryMax < salaryMin) {
      return res.status(400).json({
        message:
          "Maximum salary must be greater than minimum salary"
      });
    }

    const job = await Job.create({
      title: req.body.title.trim(),
      company: req.body.company.trim(),
      location: req.body.location.trim(),

      role: req.body.role || "",

      type: req.body.type || "fulltime",

      description:
        req.body.description || "",

      skills: Array.isArray(req.body.skills)
        ? req.body.skills
        : req.body.skills
        ? req.body.skills
            .split(",")
            .map(s => s.trim())
        : [],

      salary: {
        min: salaryMin,
        max: salaryMax
      },

      experience:
        req.body.experience || "0-2",

      status:
        req.body.status || "active",

      createdBy: req.user.id
    });

    if (global.io) {
      io.emit("jobCreated", job);
    }

    res.status(201).json(job);

  } catch (err) {

    console.error(
      "CREATE JOB ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }
};

const getAllJobs = async (req, res) => {
  try {
    const { keyword = "", location = "", page = 1, limit = 10 } = req.query;

    const query = {
  status: "active"
};

if (keyword) {
  query.$or = [
    {
      title: {
        $regex: keyword,
        $options: "i"
      }
    },
    {
      company: {
        $regex: keyword,
        $options: "i"
      }
    },
    {
      role: {
        $regex: keyword,
        $options: "i"
      }
    },
    {
      skills: {
        $regex: keyword,
        $options: "i"
      }
    }
  ];
}

if (location) {
  query.location = {
    $regex: location,
    $options: "i"
  };
}

    const jobs = await Job.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(
  (Number(page) - 1) *
  Number(limit)
)
      .limit(Number(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      createdBy: req.user.id
    }).sort({ createdAt: -1 });

    res.json(jobs);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const applyJob = async (req, res) => {
  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (job.status === "closed") {
      return res.status(400).json({
        message: "This job is closed"
      });
    }

    const alreadyApplied =
      job.applications.some(
        app =>
          app.user.toString() === req.user.id
      );

    if (alreadyApplied) {
      return res.status(400).json({
        message: "Already applied"
      });
    }

    job.applications.push({
      user: req.user.id,
      status: "applied",
      appliedAt: new Date()
    });

    await job.save();

    res.json({
      message: "Applied successfully",
      applicationCount:
        job.applications.length
    });

  } catch (err) {

    console.error(
      "APPLY JOB ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }
};

const saveJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (!user.savedJobs) {
      user.savedJobs = [];
    }

    const alreadySaved = user.savedJobs.some(
      jobId => jobId.toString() === id
    );

    if (alreadySaved) {
      return res.status(400).json({
        message: "Job already saved"
      });
    }

    user.savedJobs.push(id);

    await user.save();

    res.json({
      message: "Job saved successfully"
    });

  } catch (err) {
    console.error(
      "SAVE JOB ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

const getJobApplicants = async (req, res) => {
  try {

    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(jobId)
      .populate(
        "applications.user",
        "name email headline profilePicture"
      );

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    // Optional: allow only the recruiter who created the job
    if (
      job.createdBy.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    const applicants = job.applications.map(app => ({
      user: app.user,
      status: app.status,
      appliedAt: app.appliedAt
    }));

    res.json(applicants);

  } catch (err) {

    console.error(
      "GET APPLICANTS ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch applicants"
    });

  }
};


const rankJobApplicants = async (req, res) => {
  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(id)
      .populate(
        "applications.user",
        "name email headline skills"
      );

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (
      job.createdBy.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    const ranked = job.applications.map(app => {

      let score = 50;

      switch (app.status) {
        case "shortlisted":
          score = 90;
          break;

        case "reviewing":
          score = 70;
          break;

        case "applied":
          score = 50;
          break;

        case "hired":
          score = 100;
          break;

        case "rejected":
          score = 10;
          break;
      }

      return {
        ...app.toObject(),
        score
      };
    });

    ranked.sort(
      (a, b) => b.score - a.score
    );

    res.json(ranked);

  } catch (err) {

    console.error(
      "RANK APPLICANTS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

const getRecommendedJobs = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const userSkills = (user.skills || [])
      .map(skill => skill.toLowerCase());

    if (userSkills.length === 0) {
      return res.json([]);
    }

    const jobs = await Job.find({
      status: "active"
    })
      .populate("createdBy", "name")
      .limit(50);

    const scoredJobs = jobs.map(job => {

      const searchableText = [
        job.title,
        job.description,
        job.role,
        ...(job.skills || [])
      ]
        .join(" ")
        .toLowerCase();

      let matchScore = 0;

      userSkills.forEach(skill => {

        if (
          searchableText.includes(skill)
        ) {
          matchScore += 10;
        }

      });

      return {
        ...job.toObject(),
        matchScore
      };
    });

    const recommendedJobs = scoredJobs
      .filter(job => job.matchScore > 0)
      .sort(
        (a, b) =>
          b.matchScore - a.matchScore
      )
      .slice(0, 5);

    res.json(recommendedJobs);

  } catch (err) {

    console.error(
      "RECOMMENDED JOBS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }
};


const getMatchedJobs = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const userSkills = (user.skills || [])
      .map(skill => skill.toLowerCase());

    const jobs = await Job.find({
      status: "active"
    }).limit(20);

    const matched = jobs.map(job => {

      const jobSkills = (job.skills || [])
        .map(skill => skill.toLowerCase());

      let matchScore = 0;

      userSkills.forEach(skill => {

        if (jobSkills.includes(skill)) {
          matchScore += 25;
        }

        if (
          job.title
            ?.toLowerCase()
            .includes(skill)
        ) {
          matchScore += 15;
        }

        if (
          job.role
            ?.toLowerCase()
            .includes(skill)
        ) {
          matchScore += 10;
        }

      });

      return {
        ...job.toObject(),
        matchScore
      };

    });

    matched.sort(
      (a, b) => b.matchScore - a.matchScore
    );

    res.json(matched);

  } catch (err) {

    console.error(
      "MATCHED JOBS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }
};


const notifyJobMatch = async (req, res) => {
  try {
    const { userId } = req.body;

    await Notification.create({
      recipient: userId,
      sender: req.user.id,
      type: "job",
      message: "New job matches your skills"
    });

    res.json({ message: "Notification sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getMyApplications = async (req, res) => {
  try {
    const jobs = await Job.find({
      "applications.user": req.user.id
    }).populate("createdBy", "name");

    const applications = jobs.flatMap(job =>
      job.applications
        .filter(app => app.user.toString() === req.user.id)
        .map(app => ({
          job: {
            id: job._id,
            title: job.title,
            company: job.company,
            location: job.location,
            role: job.role
          },
          status: app.status || "Applied",
          appliedAt: app.appliedAt
        }))
    );

    res.json(applications);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch applications"
    });
  }
};


const deleteJob = async (req, res) => {
  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (
      !job.createdBy ||
      job.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    await job.deleteOne();

    if (global.io) {
      io.emit("jobDeleted", id);
    }

    res.json({
      message: "Job deleted successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Delete failed"
    });

  }
};

const updateJob = async (req, res) => {
  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    job.title = req.body.title ?? job.title;
    job.company = req.body.company ?? job.company;
    job.location = req.body.location ?? job.location;
    job.role = req.body.role ?? job.role;
    job.type = req.body.type ?? job.type;
    job.description = req.body.description ?? job.description;
    job.experience = req.body.experience ?? job.experience;
    job.status = req.body.status ?? job.status;

    if (req.body.skills !== undefined) {
      job.skills = Array.isArray(req.body.skills)
        ? req.body.skills
        : req.body.skills
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
    }

    const salaryMin =
      req.body.salaryMin ??
      req.body.salary?.min;

    const salaryMax =
      req.body.salaryMax ??
      req.body.salary?.max;

    if (
      salaryMin !== undefined ||
      salaryMax !== undefined
    ) {
      job.salary = {
        min:
          salaryMin !== undefined
            ? Number(salaryMin)
            : job.salary.min,

        max:
          salaryMax !== undefined
            ? Number(salaryMax)
            : job.salary.max
      };
    }

    // Salary validation
    if (
      job.salary.max < job.salary.min
    ) {
      return res.status(400).json({
        message:
          "Maximum salary must be greater than minimum salary"
      });
    }

    await job.save();

    // Emit before response
    if (global.io) {
      io.emit("jobUpdated", job);
    }

    res.json(job);

  } catch (err) {

    console.error(
      "UPDATE JOB ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

const getRecruiterJobs = async (req, res) => {
  try {

    const jobs = await Job.find({
      createdBy: req.user.id
    })
      .sort({ createdAt: -1 });

    const totalJobs = jobs.length;

    const activeJobs = jobs.filter(
      job => job.status === "active"
    ).length;

    const totalApplicants = jobs.reduce(
      (sum, job) =>
        sum + (job.applications?.length || 0),
      0
    );

    res.json({
      totalJobs,
      activeJobs,
      totalApplicants,
      jobs
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to fetch jobs"
    });

  }
};

const updateApplicationStatus = async (req, res) => {
  try {

    const { jobId, userId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "applied",
      "reviewing",
      "shortlisted",
      "hired",
      "rejected"
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(jobId)
    ) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    if (
      !job.createdBy ||
      job.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    const application =
      job.applications.find(
        app =>
          app.user.toString() === userId
      );

    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    application.status = status;

    await job.save();

    // Create notification
    await Notification.create({
      recipient: userId,
      sender: req.user.id,
      type: "job",
      message: `Your application status has been updated to ${status}`
    });

    if (global.io) {
      io.emit("applicationStatusUpdated", {
        jobId,
        userId,
        status
      });
    }

    res.json({
      message:
        "Application status updated",
      application
    });

  } catch (err) {

    console.error(
      "UPDATE APPLICATION STATUS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }
};

module.exports = {
  createJob,
  getAllJobs,
  getMyJobs,
  applyJob,
  saveJob,
  getRecommendedJobs,
  getMatchedJobs,
  notifyJobMatch,
  rankJobApplicants,
  getMyApplications,
  deleteJob,
  updateJob,
  getJobApplicants,
  getRecruiterJobs,
  updateApplicationStatus
};