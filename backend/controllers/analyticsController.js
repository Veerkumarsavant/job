const Application = require("../models/Application");

const getRecruiterAnalytics = async (req, res) => {
  try {
    const {
      range = 30,
      job = "all"
    } = req.query;

    const days = Number(range);
    const startDate = new Date();

    startDate.setDate(
      startDate.getDate() - days
    );

    const query = {
      createdAt: {
        $gte: startDate
      }

    };

    if (job !== "all") {
      query.job = job;
    }

    const applications =await Application.find(query);
    const totalApplicants =applications.length;
    const scheduled =applications.filter(a => a.status === "Scheduled").length;
    const completed =applications.filter(a => a.status === "Completed").length;
    const rejected =applications.filter(a => a.status === "Rejected").length;
    const conversion =totalApplicants? Math.round((completed / totalApplicants) * 100): 0;
    const grouped = {};

    applications.forEach(app => {
      const date =new Date(app.createdAt).toISOString().split("T")[0];
      grouped[date] =(grouped[date] || 0) + 1;
    });

    const growthLabels =Object.keys(grouped).sort();
    const growthValues =growthLabels.map(label => grouped[label]);

    res.json({
      totalApplicants,
      scheduled,
      completed,
      rejected,
      conversion,
      growth: {
        labels: growthLabels,
        values: growthValues
      },

      status: {
        Scheduled: scheduled,
        Completed: completed,
        Rejected: rejected
      },

      aiUsage: {
        labels: [
          "Used AI",
          "Not Used"
        ],
        values: [8, 12]
      },

      funnel: [
        totalApplicants,
        scheduled,
        completed,
        conversion
      ]

    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Analytics failed"
    });

  }

};

module.exports = {getRecruiterAnalytics};
