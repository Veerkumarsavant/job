const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error("Authentication token missing"));
            }
            const decoded = jwt.verify(token,process.env.JWT_ACCESS_SECRET);
            if (decoded.type !== "access") {
                return next(new Error("Invalid access token"));
            }
            const user = await User.findById(decoded.id).select("_id name email role isVerified");
            if (!user || !user.isVerified) {
                return next(new Error("User not authorized"));
            }
            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (err) {

            console.error("Socket authentication failed:", err.message);
            next(new Error("Authentication failed"));
        }

    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        console.log("🟢 Socket connected:", userId);
        socket.join(userId);
        socket.on("notification:delivered", (id) => {
            console.log("Notification delivered:", id);
        });

        socket.on("notification:read", (id) => {
            console.log("Notification read:", id);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔴 Socket disconnected:",userId,reason);
        });

    });

};