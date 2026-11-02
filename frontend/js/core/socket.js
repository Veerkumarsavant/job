/* ================= SOCKET ================= */

const socket = io("http://localhost:5000",{
 transports:["websocket"],
 auth:{
  token: localStorage.getItem("accessToken")
 }
});


/* ================= GLOBAL ================= */

let currentUserId = null;
let activeChatUser = null;


/* ================= INIT ================= */

async function init(){

 try{

  const user = await apiFetch("/api/auth/me");
  currentUserId = user._id;

 }catch(err){

  localStorage.removeItem("accessToken");
  window.location="/auth/login.html";

 }

}

init();


/* ================= NOTIFICATIONS ================= */

const notificationSound = new Audio("/assets/notification.mp3");

socket.on("notification",(data)=>{

 notificationSound.play().catch(()=>{});
 showNotification(data.message);

});

function showNotification(msg){

 const panel = document.getElementById("notificationPanel");
 if(!panel) return;

 const div = document.createElement("div");
 div.className="notif-item";
 div.innerText = msg;

 panel.prepend(div);

 const badge = document.getElementById("notifCount");
 badge.innerText = parseInt(badge.innerText || 0) + 1;

}


/* ================= CHAT ================= */

function openConversation(userId,name){

 activeChatUser = userId;

 document.getElementById("chatUserName").innerText = name;

 document.getElementById("chatMessages").innerHTML="";

}


/* ================= SEND ================= */

function sendMessage(){

 const input = document.getElementById("chatInput");
 const text = input.value.trim();

 if(!text || !activeChatUser) return;

 socket.emit("send_message",{
  to: activeChatUser,
  message: text
 });

 input.value="";

}


/* ================= RECEIVE ================= */

socket.on("receive_message",(msg)=>{

 const type =
  msg.sender === currentUserId ? "sent" : "received";

 appendMessage(msg.message,type);

});


/* ================= SENT CONFIRM ================= */

socket.on("message_sent",(msg)=>{

 appendMessage(msg.message,"sent");

});


/* ================= UI ================= */

function appendMessage(text,type){

 const chat = document.getElementById("chatMessages");

 const div = document.createElement("div");

 div.className = `message-bubble ${type}`;
 div.innerText = text;

 chat.appendChild(div);
 chat.scrollTop = chat.scrollHeight;

}


/* ================= TYPING ================= */

let typingTimeout;

document.getElementById("chatInput")
.addEventListener("input",()=>{

 if(!activeChatUser) return;

 socket.emit("typing",{to:activeChatUser});

 clearTimeout(typingTimeout);

 typingTimeout = setTimeout(()=>{
  socket.emit("stopTyping",{to:activeChatUser});
 },1000);

});


socket.on("userTyping",({from})=>{

 if(from === activeChatUser){
  document.getElementById("typingIndicator").innerText="Typing...";
 }

});

socket.on("userStoppedTyping",()=>{
 document.getElementById("typingIndicator").innerText="";
});


/* ================= SOCKET ERRORS ================= */

socket.on("forceLogout",()=>{

 alert("Session expired");

 localStorage.removeItem("accessToken");
 window.location="/auth/login.html";

});

socket.on("connect_error",()=>{

 localStorage.removeItem("accessToken");
 window.location="/auth/login.html";

});