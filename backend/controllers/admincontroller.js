const User = require("../models/User");
const Job = require("../models/Job");
const Post = require("../models/Post");
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "all" } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role !== "all") {
      query.role = role;
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    res.json({
      users,
      total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
};
exports.updateUser = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["active", "suspended"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to update user"
    });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({
      message: "User deleted"
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete user"
    });
  }
};
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("recruiter", "name");
    res.json(jobs);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch jobs"
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({
      message: "Job deleted"
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete job"
    });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name");

    res.json(posts);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch posts"
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({
      message: "Post deleted"
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete post"
    });
  }
};

exports.getAnalytics = async (req, res) => {

  try {

    const days =
      Number(req.query.days) || 30;

    const startDate = new Date();

    startDate.setDate(
      startDate.getDate() - days
    );

  

    const totalUsers =
      await User.countDocuments({
        createdAt: { $gte: startDate }
      });

    const totalPosts =
      await Post.countDocuments({
        createdAt: { $gte: startDate }
      });

    const totalJobs =
      await Job.countDocuments({
        createdAt: { $gte: startDate }
      });

   

    const userGrowth =
      await User.aggregate([

        {
          $match: {
            createdAt: {
              $gte: startDate
            }
          }
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: {
              $sum: 1
            }
          }
        },

        {
          $sort: {
            _id: 1
          }
        }

      ]);

   

    const aiUsage = [
      {
        _id: "Resume AI",
        count: 120
      },
      {
        _id: "Job Match",
        count: 80
      },
      {
        _id: "Chat Assistant",
        count: 65
      }
    ];

   

    const revenue = [
      {
        _id: "Week 1",
        total: 500
      },
      {
        _id: "Week 2",
        total: 1200
      },
      {
        _id: "Week 3",
        total: 2200
      }
    ];

    res.json({

      totalUsers,
      totalPosts,
      totalJobs,

      userGrowth,
      aiUsage,
      revenue

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to fetch analytics"
    });

  }

};