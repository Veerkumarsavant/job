const Message = require("../models/Message");
const notify = require("../utils/notify");

const getRoomId = (user1, user2) => {
  return [user1, user2].sort().join("_");
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const roomId = getRoomId(userId, otherUserId);

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .populate("sender", "name");

    res.json(messages);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const receiver = req.params.userId;
    const text = req.body.text || req.body.message;

    if (!text) {
      return res.status(400).json({
        message: "Message cannot be empty"
      });
    }

    const roomId = getRoomId(sender, receiver);

    const message = await Message.create({
      sender,
      receiver,
      roomId,
      text,
      status: "sent"
    });

    await message.populate("sender", "name");
    const io = req.app.get("io");
    if (io) {
      const room = getRoomId(sender, receiver);
      io.to(room).emit("newMessage", message);
      io.to(receiver.toString()).emit("newMessage", message);
    }

    await notify(req, {
      recipient: receiver,
      sender,
      type: "message",
      message: "sent you a message",
      link: `/user/messages.html?user=${sender}`
    });

    res.json(message);

  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Send message failed" });
  }
};


const sendImage = async (req, res) => {
  try {
    const sender = req.user.id;
    const receiver = req.params.userId;

    const roomId = getRoomId(sender, receiver);

    const message = await Message.create({
      sender,
      receiver,
      roomId,
      attachments: [`/uploads/${req.file.filename}`],
      status: "sent"
    });

    const io = req.app.get("io");

    if (io) {
      io.to(roomId).emit("newMessage", message);
    }

    res.json(message);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Image send failed" });
  }
};

const sendVoice = async (req, res) => {
  try {
    const sender = req.user.id;
    const receiver = req.params.userId;

    const roomId = getRoomId(sender, receiver);

    const message = await Message.create({
      sender,
      receiver,
      roomId,
      attachments: [`/uploads/${req.file.filename}`],
      status: "sent"
    });

    const io = req.app.get("io");

    if (io) {
      io.to(roomId).emit("newMessage", message);
    }

    res.json(message);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Voice send failed" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await message.deleteOne();

    res.json({ message: "Message deleted" });

  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};

const markSeen = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.user.id,
        status: { $ne: "seen" }
      },
      {
        status: "seen"
      }
    );

    res.json({ message: "Messages marked as seen" });

  } catch (err) {
    res.status(500).json({ message: "Failed to mark seen" });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  sendImage,
  sendVoice,
  deleteMessage,
  markSeen
};