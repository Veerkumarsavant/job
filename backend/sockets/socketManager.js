const notificationSocket = require("./notificationSocket");
const chatSocket = require("./chatSocket");
const presenceSocket = require("./presenceSocket");

module.exports = function initSockets(io){

 io.on("connection",(socket)=>{

  const userId = socket.handshake.auth?.userId;

  if(!userId){
   console.log("Socket connected without userId");
   return;
  }

  console.log("User connected:",userId);

  socket.join(userId);

  notificationSocket(io,socket,userId);
  chatSocket(io,socket,userId);
  presenceSocket(io,socket,userId);

 });

};