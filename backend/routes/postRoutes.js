const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { postUpload } = require("../middleware/upload");

const {
  createPost,
  getFeed,
  likePost,
  addComment,
  deletePost,
  updatePost,
  getMyPosts,
  getUserPosts,
  getTrendingPosts,
  getPersonalizedFeed
} = require("../controllers/postController");

router.post("/",protect,postUpload.single("image"),createPost);
router.get("/feed", protect, getFeed);
router.get("/personalized", protect, getPersonalizedFeed);
router.get("/trending", protect, getTrendingPosts);
router.get("/me", protect, getMyPosts);
router.get("/user/:id", protect, getUserPosts);
router.post("/:id/like", protect, likePost);
router.post("/:id/comment", protect, addComment);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);

module.exports = router;