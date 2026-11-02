const Notification = require("../models/Notification");

const createNotification = async ({
  io,
  recipient,
  sender = null,
  type,
  message,
  link = "#",
  meta = {},
  priority = "normal"
}) => {
  try {

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      link,
      meta,
      priority
    });


    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name avatar");

    if (io) {
      io.to(recipient.toString()).emit("notification", populatedNotification);
    }

    return populatedNotification;

  } catch (err) {
    console.error("❌ Notification create error:", err);
    throw err;
  }
};


const getUserNotifications = async (
  userId,
  page = 1,
  limit = 10,
  filters = {}
) => {
  const query = {
    recipient: userId,
    isDeleted: false
  };

  if (filters.type) query.type = filters.type;
  if (filters.unreadOnly === "true") query.read = false;

  return Notification.find(query)
    .populate("sender", "name avatar")
    .sort({ isPinned: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};


const markAsRead = async (id, userId) => {
  return Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { read: true, deliveryStatus: "read" },
    { new: true }
  );
};


const markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { recipient: userId, read: false },
    { read: true, deliveryStatus: "read" }
  );
};


const deleteNotification = async (id, userId) => {
  return Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { isDeleted: true },
    { new: true }
  );
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({
    recipient: userId,
    read: false,
    isDeleted: false
  });
};


module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};