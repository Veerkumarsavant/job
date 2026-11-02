module.exports = function chatSocket(io, socket, userId) {

  console.log("💬 Chat initialized for:", userId);

  socket.on("sendMessage", function (data) {

    const receiverId = data.receiverId;
    const message = data.message;

    if (!receiverId || !message) return;

    io.to(receiverId).emit("receiveMessage", {
      sender: userId,
      message: message,
      createdAt: new Date()
    });

  });

  socket.on("typing", function (data) {

    const receiverId = data.receiverId;

    if (!receiverId) return;

    io.to(receiverId).emit("typing", {
      sender: userId
    });

  });


  socket.on("joinChat", function (chatId) {

    if (!chatId) return;

    socket.join(chatId);
  });

  socket.on("sendGroupMessage", function (data) {

    const chatId = data.chatId;
    const message = data.message;

    if (!chatId || !message) return;

    io.to(chatId).emit("receiveGroupMessage", {
      sender: userId,
      message: message,
      createdAt: new Date()
    });

  });

};