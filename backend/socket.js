const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const Notification = require("./models/Notification");
const User = require("./models/User");

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const user = await User.findById(decoded.id).select("_id name");
      if (!user) {
        return next(new Error("Unauthorized"));
      }
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });


  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log("🟢 Connected:", userId);
    socket.join(userId);
    io.emit("onlineUsers", getOnlineUsers(io));
    socket.on("sendMessage", async ({ to, text, image, audio }, callback) => {
      try {
        const roomId = [userId, to].sort().join("_");
        socket.join(roomId);
        const message = await Message.create({
          sender: userId,
          receiver: to,
          roomId,
          text: text || "",
          attachments: [
            ...(image ? [image] : []),
            ...(audio ? [audio] : [])
          ],
          status: "sent",
          readBy: [userId]
        });

        await message.populate("sender", "name");
        io.to(roomId).emit("newMessage", message);
        socket.emit("messageSent", message);
        if (callback) callback({ status: "ok", message });
        const notification = await Notification.create({
          recipient: to,
          sender: userId,
          type: "message",
          message: "sent you a message",
          link: `/user/messages.html?user=${userId}`
        });
        io.to(to).emit("newNotification", notification);
      } catch (err) {
        console.error("❌ Message error:", err);
        if (callback) callback({ status: "error" });
      }
    });
    socket.on("joinChat", ({ otherUserId }) => {
      const room = [userId, otherUserId].sort().join("_");
      socket.join(room);
    });

    socket.on("leaveChat", ({ otherUserId }) => {
      const room = [userId, otherUserId].sort().join("_");
      socket.leave(room);
    });

    socket.on("typing", ({ to }) => {
      const room = [userId, to].sort().join("_");
      socket.to(room).emit("userTyping", { from: userId });
    });

    socket.on("stopTyping", ({ to }) => {
      const room = [userId, to].sort().join("_");
      socket.to(room).emit("userStoppedTyping", { from: userId });
    });

    socket.on("messageSeen", async ({ from }) => {
      try {
        await Message.updateMany(
          {
            sender: from,
            receiver: userId,
            status: { $ne: "seen" }
          },
          { status: "seen" }
        );
        io.to(from).emit("messageSeen", { by: userId });
      } catch (err) {
        console.error("❌ Seen error:", err);
      }
    });


    socket.on("postInteraction", async ({ to, type, postId }) => {
      try {
        const notification = await Notification.create({
          recipient: to,
          sender: userId,
          type,
          message:
            type === "post_like"
              ? "liked your post"
              : "commented on your post",
          link: `/posts/${postId}`
        });

        io.to(to).emit("newNotification", notification);

      } catch (err) {
        console.error("❌ Post interaction error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", userId);
      io.emit("onlineUsers", getOnlineUsers(io));
    });

  });
}

function getOnlineUsers(io) {
  const users = [];
  for (let [room, sockets] of io.sockets.adapter.rooms) {
    if (!io.sockets.sockets.get(room)) {
      users.push(room);
    }
  }

  return users;
}

module.exports = { setupSocket };