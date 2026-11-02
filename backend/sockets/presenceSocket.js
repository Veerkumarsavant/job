const onlineUsers = new Map();

module.exports = function(io,socket,userId){

 onlineUsers.set(userId,socket.id);

 io.emit("userOnline",userId);

 socket.on("disconnect",()=>{

  onlineUsers.delete(userId);

  io.emit("userOffline",userId);

 });

};