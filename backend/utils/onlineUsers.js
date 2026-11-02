const onlineUsers = new Map();
const socketToUser = new Map();
function addUser(userId, socketId) {
 if (!userId || !socketId) return;
 if (!onlineUsers.has(userId)) {
  onlineUsers.set(userId, new Set());
 }
 onlineUsers.get(userId).add(socketId);
 socketToUser.set(socketId, userId);
}
function removeUser(socketId) {
 const userId = socketToUser.get(socketId);
 if (!userId) return null;
 const sockets = onlineUsers.get(userId);
 if (!sockets) return null;
 sockets.delete(socketId);
 socketToUser.delete(socketId);
 if (sockets.size === 0) {
  onlineUsers.delete(userId);
  return userId;  
 }
 return null;   
}

function getUserSockets(userId) {
 return onlineUsers.get(userId) || new Set();
}
function isUserOnline(userId) {
 return onlineUsers.has(userId);
}

function getOnlineUsers() {
 return Array.from(onlineUsers.keys());
}
module.exports = {
 addUser,
 removeUser,
 getUserSockets,
 isUserOnline,
 getOnlineUsers
};