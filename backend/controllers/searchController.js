const User = require("../models/User");
const Post = require("../models/Post");
const Job = require("../models/Job");

const globalSearch = async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q) {
      return res.json({
        users: [],
        posts: [],
        jobs: []
      });
    }


    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [users, posts, jobs] = await Promise.all([
      User.find({
        $or: [
          { name: regex },
          { headline: regex },
          { "skills.name": regex }
        ]
      })
      .select("_id name headline avatar skills")
      .limit(10)
      .lean(),

      Post.find({
        content: regex
      })
      .populate("author", "name avatar")
      .limit(10)
      .lean(),

      Job.find({
        $or: [
          { title: regex },
          { company: regex },
          { location: regex },
          { skillsRequired: regex }
        ]
      })
      .select("title company location skillsRequired")
      .limit(10)
      .lean()

    ]);

    const scoreText = (text = "", q) =>text.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
    const scoredUsers = users.map(u => ({
      ...u,
      score:
        scoreText(u.name, q) * 3 +
        scoreText(u.headline, q) * 2
    }));

    const scoredPosts = posts.map(p => ({...p,score: scoreText(p.content, q) * 2}));
    const scoredJobs = jobs.map(j => ({
      ...j,
      score:
        scoreText(j.title, q) * 3 +
        scoreText(j.company, q) * 2
    }));

    scoredUsers.sort((a, b) => b.score - a.score);
    scoredPosts.sort((a, b) => b.score - a.score);
    scoredJobs.sort((a, b) => b.score - a.score);

    res.json({
      users: scoredUsers.slice(0, 5),
      posts: scoredPosts.slice(0, 5),
      jobs: scoredJobs.slice(0, 5)
    });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      message: "Search failed"
    });
  }

};

module.exports = {
  globalSearch
};