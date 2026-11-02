let socket = null;
function connectSocket(){

 if(socket && socket.connected){
  console.log("⚡ Socket already connected");
  return socket;
 }

 const token = localStorage.getItem("accessToken");

 if(!token){
  console.warn("⚠️ No token → socket not connected");
  return null;
 }

 socket = io("http://localhost:5000",{
  transports:["websocket"],
  auth:{ token },
  reconnection:true,
  reconnectionAttempts:5,
  reconnectionDelay:2000
 });


 socket.on("connect",()=>{
  console.log("✅ Socket connected:", socket.id);
 });

 socket.on("disconnect",(reason)=>{
  console.warn("🔴 Socket disconnected:", reason);
 });

 socket.on("connect_error",(err)=>{
  console.error("❌ Socket error:", err.message);
 });

 socket.on("reconnect_attempt",(attempt)=>{
  console.log("🔄 Reconnecting attempt:", attempt);
 });

 socket.on("reconnect_failed",()=>{
  console.error("❌ Reconnection failed");
 });

 socket.on("notification",(data)=>{

  console.log("🔔 Notification:", data);

  if(typeof showNotification === "function"){
   showNotification(data.message || data);
  }

  if(typeof updateNotificationBadge === "function"){
   updateNotificationBadge();
  }

 });

 socket.on("onlineUsers",(users)=>{
  console.log("🟢 Online users:", users);

  if(typeof updateOnlineUsers === "function"){
   updateOnlineUsers(users);
  }
 });

 return socket;
}


function disconnectSocket(){

 if(socket){
  socket.disconnect();
  socket = null;
  console.log("🔌 Socket manually disconnected");
 }
}

function getSocket(){
 return socket;
}

window.connectSocket = connectSocket;
window.getSocket = getSocket;
window.disconnectSocket = disconnectSocket;