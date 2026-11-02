const Post = require("../models/Post");
const redisClient = require("../config/redis");

const getTrending = async (req, res) => {
  try {
    const ids = await redisClient.zRevRange("trending:global",0,9);

    if (!ids.length) {
      return res.json([]);
    }
    const posts = await Post.find({
      _id: { $in: ids }
    })
    .populate("author", "name avatar")
    .lean();

    const orderedPosts = ids.map(id =>
      posts.find(p => p._id.toString() === id)
    ).filter(Boolean);
    res.json(orderedPosts);
  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({
      message: "Trending error"
    });
  }
};
module.exports = {getTrending};

