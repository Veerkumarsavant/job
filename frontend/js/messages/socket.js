import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

const socket = io("http://localhost:5000",{
 transports:["websocket"],
 auth:{
  token: localStorage.getItem("accessToken")
 }
});

socket.on("connect",()=>{
 console.log("✅ Connected:", socket.id);
});

socket.on("connect_error",(err)=>{
 console.error("❌ Socket error:", err.message);
});

function sendMessage(to,message){
 socket.emit("send_message",{to,message});
}

socket.on("receive_message",(data)=>{
 console.log("📩 New message:", data);
});

socket.on("message_sent",(data)=>{
 console.log("✅ Message saved:", data);

});