const Notification = require("../models/Notification");

async function notify(req, {
  recipient,
  sender = null,
  type,
  message,
  link = "#",
  meta = {}
}) {
  try {

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      link,
      meta
    });

    await notification.populate("sender", "name avatar");

    const io = req.app.get("io");

    if (io) {
      io.to(recipient.toString()).emit("newNotification", notification);
    }

    return notification;

  } catch (err) {
    console.error("Notification error:", err);
  }
}

module.exports = notify;

