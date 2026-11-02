/*const API = "http://localhost:5000/api";
const token = localStorage.getItem("accessToken");

if(!token){
 window.location.href = "../auth/login.html";
}

const user = JSON.parse(localStorage.getItem("user"));



const socket = io("http://localhost:5000",{
 auth:{
  userId:user?._id
 }
});


const list = document.getElementById("notificationsList");
const emptyState = document.getElementById("emptyState");
const markAllBtn = document.getElementById("markAllBtn");



document.addEventListener("DOMContentLoaded",init);

async function init(){
 await loadNotifications();
}



async function apiFetch(endpoint,options={}){

 const res = await fetch(`${API}${endpoint}`,{
  ...options,
  headers:{
   Authorization:`Bearer ${token}`,
   "Content-Type":"application/json",
   ...options.headers
  }
 });

 if(!res.ok){
  throw new Error("API error");
 }

 return res.json();
}


async function loadNotifications(){

 const notifications = await apiFetch("/notifications");

 list.innerHTML="";

 if(notifications.length === 0){
  emptyState.style.display="block";
  return;
 }

 emptyState.style.display="none";

 notifications.forEach(n=>{

  const div=document.createElement("div");

  div.className="notification-item";

  if(!n.read){
   div.classList.add("unread");
  }

  div.innerHTML=`
   <p>${sanitize(n.message)}</p>
   <small>${timeAgo(n.createdAt)}</small>
  `;

  list.appendChild(div);

 });

 updateNotificationBadge();

}


markAllBtn?.addEventListener("click",async()=>{

 await apiFetch("/notifications/read/all",{
  method:"PUT"
 });

 loadNotifications();

});



socket.on("notification",(data)=>{

 const div=document.createElement("div");

 div.className="notification-item unread";

 div.innerHTML=`
  <p>${sanitize(data.message)}</p>
  <small>Just now</small>
 `;

 list.prepend(div);

 emptyState.style.display="none";

 updateNotificationBadge();

});



function updateNotificationBadge(){

 const badge=document.getElementById("notifBadge");

 if(!badge) return;

 const count=document.querySelectorAll(".notification-item.unread").length;

 badge.textContent=count;

 badge.style.display=count>0?"inline-block":"none";

}



function sanitize(str){
 const div=document.createElement("div");
 div.innerText=str;
 return div.innerHTML;
}

function timeAgo(date){

 const diff=Date.now()-new Date(date).getTime();

 const minutes=Math.floor(diff/60000);
 const hours=Math.floor(diff/3600000);
 const days=Math.floor(diff/86400000);

 if(minutes<1) return "Just now";
 if(minutes<60) return `${minutes}m ago`;
 if(hours<24) return `${hours}h ago`;

 return `${days}d ago`;

}



function showNotification(data){

 const container = document.getElementById("notificationContainer");

 if(!container) return;

 const div = document.createElement("div");
 div.className = "notification";

 div.innerText = data.message;

 container.prepend(div);

}*/


const API = "http://localhost:5000/api";
const token = localStorage.getItem("accessToken");

if (!token) {
  window.location.href = "../auth/login.html";
}


const socket = io("http://localhost:5000", {
  auth: { token }
});



const list = document.getElementById("notificationsList");
const emptyState = document.getElementById("emptyState");
const markAllBtn = document.getElementById("markAllBtn");


document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadNotifications();
}



async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!res.ok) throw new Error("API error");

  return res.json();
}

async function loadNotifications() {

  const data = await apiFetch("/notifications");
  const notifications = data.notifications || data; 
  list.innerHTML = "";
  if (!notifications.length) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  notifications.forEach(renderNotification);
  updateNotificationBadge();
}


function renderNotification(n, prepend = false) {
  const div = document.createElement("div");
  div.className = `notification-item ${n.read ? "" : "unread"}`;
  div.innerHTML = `
  <p>${sanitize(n.message)}</p>
  <small>${timeAgo(n.createdAt)}</small>
`;

  div.onclick = () => handleNotificationClick(n);
  if (prepend) {
    list.prepend(div);
  } else {
    list.appendChild(div);
  }
}


markAllBtn?.addEventListener("click", async () => {
  await apiFetch("/notifications/read/all", {
    method: "PUT"
  });
  loadNotifications();
});


socket.on("newNotification", (notification) => {
  console.log("🔔 New notification:", notification);
  renderNotification(notification, true);
  emptyState.style.display = "none";
  updateNotificationBadge();
  showToast(notification.message);
});


function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  const count = document.querySelectorAll(".notification-item.unread").length;
  badge.textContent = count;
  badge.style.display = count ? "inline-block" : "none";
}


function showToast(message) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function sanitize(str = "") {
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function handleNotificationClick(n) {
  n.read = true;
  markRead(n._id);
  if (n.link && n.link !== "#") {
    window.location.href = n.link;
  }
}