const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");

const recommendJobs = async (req, res) => {

  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const userSkills = (user.skills || [])
      .map(s => s.name.toLowerCase());

    const headline = (user.headline || "").toLowerCase();

    const applied = await Application.find({
      applicant: userId
    }).select("job");

    const appliedIds = new Set(
      applied.map(a => a.job.toString())
    );

    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const scoredJobs = jobs.map(job => {

      let score = 0;

      const jobSkills = (job.skillsRequired || [])
        .map(s => s.toLowerCase());

      const matchedSkills = jobSkills.filter(skill =>
        userSkills.includes(skill)
      );

      score += matchedSkills.length * 5;

      if (headline && job.title) {
        if (job.title.toLowerCase().includes(headline)) {
          score += 10;
        }
      }

      const hoursOld =
        (Date.now() - new Date(job.createdAt)) / 3600000;

      score += Math.max(24 - hoursOld, 0);

      return {
        ...job,
        score
      };

    });

    const filteredJobs = scoredJobs.filter(job =>
      !appliedIds.has(job._id.toString())
    );

    filteredJobs.sort((a, b) => b.score - a.score);

    res.json(filteredJobs.slice(0, 10));

  } catch (err) {

    console.error("Recommendation error:", err);

    res.status(500).json({
      message: "Recommendation error"
    });

  }
};

module.exports = {
  recommendJobs
};