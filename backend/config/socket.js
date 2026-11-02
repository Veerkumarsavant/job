const Message = require("./models/Message");
const onlineUsers = new Map();
function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("joinUser", (userId) => {
      if (!userId) return;
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} joined`);
    });
    socket.on("joinRoom", (roomId) => {
      if (!roomId) return;

      socket.join(roomId);
      console.log(`Joined room ${roomId}`);
    });
    socket.on("sendMessage", async (data) => {
      try {
        if (!data.roomId || !data.text || !data.sender) return;

        const message = await Message.create({
          roomId: data.roomId,
          sender: data.sender,
          text: data.text
        });

        io.to(data.roomId).emit("receiveMessage", message);

      } catch (err) {
        console.error("Message error:", err);
      }
    });
    socket.on("sendNotification", ({ userId, notification }) => {
      const targetSocket = onlineUsers.get(userId);
      if (targetSocket) {
        io.to(targetSocket).emit("newNotification", notification);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      for (let [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
}
module.exports = { setupSocket };