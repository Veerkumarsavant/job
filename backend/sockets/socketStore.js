const onlineUsers = new Map();

function addUser(userId, socketId){
 onlineUsers.set(userId, socketId);
}

function removeUser(userId){
 onlineUsers.delete(userId);
}

function getSocketId(userId){
 return onlineUsers.get(userId);
}

module.exports = {
 addUser,
 removeUser,
 getSocketId
};