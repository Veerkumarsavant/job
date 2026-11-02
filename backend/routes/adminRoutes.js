const express = require("express");
const router = express.Router();
const { protect, authorize } =require("../middleware/authMiddleware");
const {
 getUsers,
 deleteUser,
 getJobs,
 deleteJob,
 getPosts,
 deletePost,
 getAnalytics,
    updateUser
} = require("../controllers/admincontroller");
router.get("/users",protect,authorize("admin"),getUsers);
router.put("/users/:id", protect, authorize("admin"), updateUser);
router.delete("/users/:id",protect,authorize("admin"),deleteUser);
router.get("/jobs",protect,authorize("admin"),getJobs);
router.delete("/jobs/:id",protect,authorize("admin"),deleteJob);
router.get("/posts",protect,authorize("admin"),getPosts);
router.delete("/posts/:id",protect,authorize("admin"),deletePost);
router.get("/analytics",protect,authorize("admin"),getAnalytics);
router.put("/users/:id",protect,authorize("admin"),updateUser  );
module.exports = router;