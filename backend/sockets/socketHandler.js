const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { addUser, removeUser, getSocketId } = require("../utils/socketStore");
const setupSocket = (io) => {

 io.use(async (socket, next) => {
  try {
   const token = socket.handshake.auth?.token;
   if (!token) {
    return next(new Error("No token"));
   }

   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   const user = await User.findById(decoded.id).select("_id name");

   if (!user) {
    return next(new Error("User not found"));
   }
   socket.user = user;
   next();

  } catch (err) {
   next(new Error("Unauthorized"));
  }
 });

 io.on("connection", (socket) => {

  const userId = socket.user._id.toString();
  socket.join(socket.user._id.toString());
  addUser(userId, socket.id);
  console.log("🟢 User connected:", userId);
  socket.on("send_message", ({ to, message }) => {
   const targetSocket = getSocketId(to);
   if (targetSocket) {
    io.to(targetSocket).emit("receive_message", {
     from: userId,
     message
    });
   }

  });


  socket.on("profile_update", ({ userId, user }) => {

   const targetSocket = getSocketId(userId);

   if (targetSocket) {
    io.to(targetSocket).emit("profileUpdated", {
     userId,
     user
    });
   }

  });

  socket.on("disconnect", () => {
   removeUser(userId);
   console.log("🔴 User disconnected:", userId);
  });

 });

};

module.exports = { setupSocket };