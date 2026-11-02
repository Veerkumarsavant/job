const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", ctrl.getNotifications);
router.get("/unread-count", ctrl.getUnreadCount);
router.put("/read/all", ctrl.markAll);
router.put("/read/:id", ctrl.markOne);
router.delete("/:id", ctrl.deleteNotif);

module.exports = router;