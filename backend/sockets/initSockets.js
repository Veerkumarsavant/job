const jwt = require("jsonwebtoken");

const notificationSocket = require("./notificationSocket");
const chatSocket = require("./chatSocket");
const presenceSocket = require("./presenceSocket");
const { onlineUsers } = require("./socketStore");

function initSockets(io) {

  io.use(function (socket, next) {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token) {
        return next(new Error("No token"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.id;

      next();

    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", function (socket) {

    const userId = socket.userId;

    if (!userId) {
      console.log("❌ Invalid socket connection");
      socket.disconnect();
      return;
    }

    console.log("🟢 User connected:", userId);

    /* Join personal room */
    socket.join(userId.toString());

    /* Multi-device safe storage */
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    /* ================= MODULES ================= */

    notificationSocket(io, socket, userId);
    chatSocket(io, socket, userId);
    presenceSocket(io, socket, userId);

    /* ================= DISCONNECT ================= */

    socket.on("disconnect", function () {
      console.log("🔴 User disconnected:", userId);
      // cleanup handled in presenceSocket
    });

  });

}

module.exports = initSockets;

const notificationSocket = require("./notificationSocket");
const chatSocket = require("./chatSocket");
const presenceSocket = require("./presenceSocket");

const { onlineUsers } = require("./socketStore");

module.exports = function initSockets(io) {

  /* ================= 🔐 AUTH ================= */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.id;

      next();

    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  /* ================= 🔌 CONNECTION ================= */
  io.on("connection", (socket) => {

    const userId = socket.userId;

    if (!userId) {
      console.log("❌ Invalid socket");
      socket.disconnect();   // ✅ important
      return;
    }

    console.log("🟢 User connected:", userId);

    /* Join room */
    socket.join(userId);

    /* Multi-device safe tracking */
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    /* ================= MODULES ================= */
    notificationSocket(io, socket, userId);
    chatSocket(io, socket, userId);
    presenceSocket(io, socket, userId);

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", () => {

      const sockets = onlineUsers.get(userId);

      if (sockets) {
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }

      console.log("🔴 User disconnected:", userId);
    });

  });

};