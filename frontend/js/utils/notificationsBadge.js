/* ================= SOCKET ================= */

const user = JSON.parse(localStorage.getItem("user"));

let socket = null;

if(user && user._id){

 socket = io("http://localhost:5000",{
  auth:{
   userId: user._id
  }
 });

}

/* ================= LOAD BADGE ================= */

async function loadBadge(){

 try{

  const token = localStorage.getItem("accessToken");

  if(!token) return;

  const res = await fetch("/api/notifications",{
   headers:{
    Authorization:`Bearer ${token}`
   }
  });

  if(!res.ok){
   console.error("Notification request failed");
   return;
  }

  const data = await res.json();

  const notifications = data.notifications || [];

  const unreadCount =
   notifications.filter(n => !n.read).length;

  const badge =
   document.getElementById("notificationBadge");

  if(!badge) return;

  if(unreadCount > 0){

   badge.innerText = unreadCount;
   badge.style.display = "inline-block";

  }else{

   badge.style.display = "none";

  }

 }catch(err){

  console.error("Notification badge error:",err);

 }

}

/* ================= REALTIME UPDATE ================= */

if(socket){

 socket.on("notification",(notification)=>{

  console.log("Realtime notification:",notification);

  if(typeof showNotification === "function"){
   showNotification(notification);
  }

  loadBadge();

 });

}

/* ================= INITIAL LOAD ================= */

document.addEventListener("DOMContentLoaded",()=>{

 loadBadge();

});

/* ================= EXPORT GLOBAL ================= */

window.loadBadge = loadBadge;