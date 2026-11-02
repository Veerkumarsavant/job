const API = "/api";

const socket = io("http://localhost:5000",{
 auth:{
  userId: JSON.parse(localStorage.getItem("user"))?._id
 }
});

let currentUser = null;
let activeUser = null;

async function apiFetch(url, options={}){
 const token = localStorage.getItem("accessToken");
 const res = await fetch(`${API}${url}`,{
  ...options,
  headers:{
   "Content-Type":"application/json",
   "Authorization":`Bearer ${token}`,
   ...options.headers
  }
 });

 const data = await res.json().catch(()=>({}));

 if(!res.ok){
  throw new Error(data.message || "API error");
 }

 return data;
}

async function init(){
 try{
  const user = await apiFetch("/auth/me");
  currentUser = user._id;
  socket.emit("join",currentUser);
 }catch(err){
  console.error("Auth error:",err);
 }

}

init();

async function openChat(userId,name){
 activeUser = userId;
 document.getElementById("chatUser").innerText = name;
 loadMessages(userId);

}

async function loadMessages(userId){
 try{
  const messages =await apiFetch(`/messages/${userId}`);
  const container = document.getElementById("messages");
  container.innerHTML="";
  messages.forEach(msg=>{
   const type =msg.sender === currentUser? "sent": "received";
   appendMessage(msg.text,type,msg.createdAt);
  });
 }catch(err){
  console.error("Load messages error:",err);
 }
}

function appendMessage(text,type,timeStamp){
 const container =document.getElementById("messages");
 const div = document.createElement("div");
 div.className = `message ${type}`;
 const span = document.createElement("span");
 span.innerText = text;
 const time = document.createElement("small");
 time.className = "message-time";
 const date = new Date(timeStamp || Date.now());

 time.innerText = date.toLocaleTimeString([],{
  hour:"2-digit",
  minute:"2-digit"
 });

 div.appendChild(span);
 div.appendChild(time);
 container.appendChild(div);
 container.scrollTop = container.scrollHeight;
}
 

async function sendMessage(){
 const input =document.getElementById("messageInput");
 const text = input.value.trim();
 if(!text || !activeUser) return;
 try{
  const saved =await apiFetch(`/messages/${activeUser}`,{
   method:"POST",
   body:JSON.stringify({text})
  });

  socket.emit("sendMessage",{
   receiverId: activeUser,
   message: saved.text
  });
  appendMessage(saved.text,"sent",saved.createdAt);
  input.value="";
 }catch(err){
  console.error("Send message error:",err);
 }
}

document.getElementById("sendBtn").addEventListener("click",sendMessage);
document.getElementById("messageInput").addEventListener("keypress",e=>{

 if(e.key === "Enter"){
  sendMessage();
 }

});

socket.on("receiveMessage",(msg)=>{
 const { sender, message, createdAt } = msg;
 if(sender === activeUser){
  appendMessage(message,"received",createdAt);
 }
});

const input =document.getElementById("messageInput");
let typingTimeout;

input.addEventListener("input",()=>{
 if(!activeUser) return;
 socket.emit("typing",{
  receiverId: activeUser
 });

 clearTimeout(typingTimeout);
 typingTimeout = setTimeout(()=>{
  socket.emit("stopTyping",{
   receiverId: activeUser
  });

 },1500);

});


socket.on("typing",({sender})=>{
 if(sender === activeUser){
  document
  .getElementById("typingIndicator")
  .style.display="block";
 }
});


socket.on("stopTyping",()=>{
 document.getElementById("typingIndicator").style.display="none";
});

socket.on("onlineUsers",users=>{
 console.log("Online users:",users);
});


function sendMessage(toUserId){
 const input = document.getElementById("chatInput");
 const message = input.value.trim();
 if(!message) return;
 const socket = getSocket();
 socket.emit("send_message",{
  to:toUserId,
  message
 });

 addMessageToUI("You", message);
 input.value="";
}


function initChat(){
 const socket = getSocket();
 socket.on("receive_message",(data)=>{
  addMessageToUI(data.from, data.message);

 });

}

function addMessageToUI(sender, message){

 const box = document.getElementById("chatBox");

 const div = document.createElement("div");
 div.innerText = `${sender}: ${message}`;

 box.appendChild(div);
}