const service = require("../services/notificationService");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      type: req.query.type,
      unreadOnly: req.query.unreadOnly
    };

    const notifications = await service.getUserNotifications(
      userId,
      page,
      limit,
      filters
    );

    res.json({
      notifications,
      page,
      limit
    });

  } catch (err) {
    console.error("❌ Get notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await service.getUnreadCount(req.user.id);
    res.json({ count });

  } catch (err) {
    console.error("❌ Unread count error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const markOne = async (req, res) => {
  try {
    const updated = await service.markAsRead(
      req.params.id,
      req.user.id
    );

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(updated);

  } catch (err) {
    console.error("❌ Mark read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const markAll = async (req, res) => {
  try {
    await service.markAllAsRead(req.user.id);
    res.json({ message: "All notifications marked as read" });

  } catch (err) {
    console.error("❌ Mark all read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteNotif = async (req, res) => {
  try {
    const deleted = await service.deleteNotification(
      req.params.id,
      req.user.id
    );

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });

  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markOne,
  markAll,
  deleteNotif
};