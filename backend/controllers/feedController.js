const Post = require("../models/Post");
const redisClient = require("../config/redis");
const { calculateAIScore } = require("../services/feedAIService");
const { cosineSimilarity } = require("../services/vectorUtils");
const getSmartFeed = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    let version = "0";
    try {
      if (redisClient) {
        version = (await redisClient.get("feed:version")) || "0";
      }
    } catch {}
    const cacheKey = `feed:${userId}:version:${version}:page:${page}`;
    try {
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      }
    } catch {}
    const posts = await Post.find({
      $or: [
        { author: { $in: user.connections || [] } },
        { industry: user.industry }
      ]
    })
      .populate("author", "name avatar headline")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const rankedPosts = posts.map(post => {
      let score = 0;
      const likes = post.likes?.length || 0;
      const comments = post.comments?.length || 0;
      score += likes * 2;
      score += comments * 3;
      const hoursOld =
        (Date.now() - new Date(post.createdAt)) / 3600000;
      score += Math.max(24 - hoursOld, 0); 
      score += calculateAIScore(user, post);
      if (user.embedding && post.embedding) {
        const similarity = Math.max(
          0,
          cosineSimilarity(user.embedding, post.embedding)
        );
        score += similarity * 100;
      }
      return { ...post, score };
    });

    rankedPosts.sort((a, b) => b.score - a.score);
    const paginated = rankedPosts.slice(skip, skip + limit);
    const response = {
      page,
      hasMore: rankedPosts.length > skip + limit,
      posts: paginated
    };
    try {

  if (redisClient?.isReady) {
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
  }
} catch (err) {
  console.warn("Redis write skipped:", err.message);
}

    res.json(response);
  } catch (err) {
    console.error("Smart feed error:", err);
    res.status(500).json({ message: "Feed error" });
  }
};

const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    let version = "0";
    try {
      if (redisClient) {
        version = (await redisClient.get("feed:version")) || "0";
      }
    } catch {}
    const cacheKey = `feed:${userId}:version:${version}:page:${page}`;
    try {
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      }
    } catch {
      console.log("Redis read skipped");
    }
    const posts = await Post.find()
      .populate("author", "name avatar headline")
      .populate("comments.user", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const response = {
      success: true,
      page,
      hasMore: posts.length === limit,
      posts
    };
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    } catch {
      console.log("Redis write skipped");
    }
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Feed error" });
  }
};


const getTrending = async (req, res) => {
  try {

    const ids = await redisClient.zRevRange(
      "trending:global",
      0,
      9
    );

    if (!ids.length) return res.json([]);
    const posts = await Post.find({
      _id: { $in: ids }
    })
      .populate("author", "name avatar")
      .lean();

    const ordered = ids
      .map(id => posts.find(p => p._id.toString() === id))
      .filter(Boolean);

    res.json(ordered);

  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({ message: "Trending error" });
  }
};

module.exports = {
  getSmartFeed,
  getFeed,
  getTrending
};