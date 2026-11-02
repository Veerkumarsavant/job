const Post = require("../models/Post");
const redisClient = require("../config/redis");
const notify = require("../utils/notify");
const fs = require("fs");
const path = require("path");

function extractHashtags(text) {
  return text?.match(/#\w+/g)?.map(tag => tag.toLowerCase()) || [];
}

const createPost = async (req, res) => {
  try {
    const content = req.body.content?.trim() || "";
    const image = req.file
      ? `/uploads/posts/${req.file.filename}`
      : "";

    if (!content && !image) {
      return res.status(400).json({
        message: "Post must contain text or image"
      });
    }

    const hashtags = extractHashtags(content);

    const post = await Post.create({
      author: req.user.id,
      content,
      image,
      hashtags
    });

    const populatedPost = await post.populate([
      { path: "author", select: "name avatar headline" },
      { path: "comments.user", select: "name avatar" }
    ]);

    try {
      if (redisClient) {
        await redisClient.incr("feed:version");
      }
    } catch (err) {
      console.log("Redis version increment skipped");
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("newPost", populatedPost);
    }

    res.status(201).json(populatedPost);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Post creation failed"
    });
  }
};

const getFeed = async (req, res) => {
  try {
    const page =
      parseInt(req.query.page) || 1;

    const limit = 10;

    const skip =
      (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar headline")
      .populate("comments.user", "name avatar");

    res.json(posts);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load feed"
    });
  }
};

/* =========================
   LIKE / UNLIKE
========================= */
const likePost = async (req, res) => {
  try {

    const post =
      await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    const userId = req.user.id;

    const alreadyLiked =
      post.likes.some(
        id => id.toString() === userId
      );

    let isLiked = false;

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
      isLiked = true;
    }

    await post.save();

    if (
      isLiked &&
      post.author.toString() !== userId
    ) {
      await notify(req, {
        recipient: post.author,
        sender: userId,
        type: "post_like",
        message: "liked your post",
        link: `/posts/${post._id}`
      });
    }

    try {
      if (redisClient) {
        await redisClient.incr("feed:version");
      }
    } catch {}

    const updatedPost = await post.populate([
      { path: "author", select: "name avatar headline" },
      { path: "comments.user", select: "name avatar" }
    ]);

    const io = req.app.get("io");

    if (io) {
      io.emit(
        "postReactionUpdate",
        updatedPost
      );
    }

    res.json(updatedPost);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Like failed"
    });
  }
};

/* =========================
   COMMENT
========================= */
const addComment = async (req, res) => {
  try {

    const text =
      req.body.text?.trim();

    if (!text) {
      return res.status(400).json({
        message: "Comment cannot be empty"
      });
    }

    const post =
      await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    post.comments.push({
      user: req.user.id,
      text
    });

    await post.save();

    if (
      post.author.toString() !== req.user.id
    ) {
      await notify(req, {
        recipient: post.author,
        sender: req.user.id,
        type: "post_comment",
        message: "commented on your post",
        link: `/posts/${post._id}`
      });
    }

    try {
      if (redisClient) {
        await redisClient.incr("feed:version");
      }
    } catch {}

    const updatedPost = await post.populate([
      { path: "author", select: "name avatar headline" },
      { path: "comments.user", select: "name avatar" }
    ]);

    const io = req.app.get("io");

    if (io) {
      io.emit("newComment", updatedPost);
    }

    res.json(updatedPost);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Comment failed"
    });
  }
};

/* =========================
   UPDATE POST
========================= */
const updatePost = async (req, res) => {
  try {

    const post =
      await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    if (
      post.author.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    const content =
      req.body.content?.trim();

    if (content) {
      post.content = content;
      post.hashtags =
        extractHashtags(content);
    }

    if (req.file) {
      post.image =
        `/uploads/posts/${req.file.filename}`;
    }

    await post.save();

    try {
      if (redisClient) {
        await redisClient.incr("feed:version");
      }
    } catch {}

    const updatedPost = await post.populate([
      { path: "author", select: "name avatar headline" },
      { path: "comments.user", select: "name avatar" }
    ]);

    const io = req.app.get("io");

    if (io) {
      io.emit("postUpdated", updatedPost);
    }

    res.json(updatedPost);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Update failed"
    });
  }
};

/* =========================
   DELETE POST
========================= */
const deletePost = async (req, res) => {
  try {

    const post =
      await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    if (
      post.author.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    if (post.image) {

      const uploadRoot = path.resolve(
        process.env.UPLOAD_DIR || path.join(__dirname, "../uploads")
      );
      // Database paths are public URLs such as /uploads/posts/file.jpg.
      const relativeImagePath = post.image.replace(/^\/?uploads\//, "");
      const imagePath = path.resolve(uploadRoot, relativeImagePath);

      // Guard against paths escaping the configured upload directory.
      if (!imagePath.startsWith(uploadRoot + path.sep)) {
        return res.status(400).json({ message: "Invalid post image path" });
      }

      if (
        fs.existsSync(imagePath)
      ) {
        fs.unlinkSync(imagePath);
      }
    }

    await post.deleteOne();

    try {
      if (redisClient) {
        await redisClient.incr("feed:version");
      }
    } catch { }

    const io = req.app.get("io");

    if (io) {
      io.emit(
        "postDeleted",
        post._id.toString()
      );
    }

    res.json({
      message: "Post deleted"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Delete failed"
    });
  }
};

/* =========================
   USER POSTS
========================= */
const getUserPosts = async (req, res) => {
  try {

    const posts =
      await Post.find({
        author: req.params.id
      })
        .sort({ createdAt: -1 })
        .populate(
          "author",
          "name avatar headline"
        );

    res.json(posts);

  } catch (err) {
    res.status(500).json({
      message: "Failed to load user posts"
    });
  }
};

/* =========================
   MY POSTS
========================= */
const getMyPosts = async (req, res) => {
  try {

    const posts =
      await Post.find({
        author: req.user.id
      })
        .sort({ createdAt: -1 })
        .populate(
          "author",
          "name avatar headline"
        );

    res.json(posts);

  } catch (err) {
    res.status(500).json({
      message: "Failed to load posts"
    });
  }
};

/* =========================
   TRENDING POSTS
========================= */
const getTrendingPosts = async (req, res) => {
  try {

    const posts =
      await Post.aggregate([
        {
          $addFields: {
            likeCount: {
              $size: "$likes"
            }
          }
        },
        {
          $sort: {
            likeCount: -1
          }
        },
        {
          $limit: 10
        }
      ]);

    res.json(posts);

  } catch (err) {
    res.status(500).json({
      message: "Trending failed"
    });
  }
};

/* =========================
   PERSONALIZED FEED
========================= */
const getPersonalizedFeed = async (req, res) => {
  try {

    const posts =
      await Post.find()
        .sort({
          createdAt: -1
        })
        .limit(20)
        .populate("author", "name avatar headline")
        .populate("comments.user", "name avatar");

    res.json(posts);

  } catch (err) {
    res.status(500).json({
      message: "Feed failed"
    });
  }
};

module.exports = {
  createPost,
  getFeed,
  likePost,
  addComment,
  updatePost,
  deletePost,
  getUserPosts,
  getMyPosts,
  getTrendingPosts,
  getPersonalizedFeed
};