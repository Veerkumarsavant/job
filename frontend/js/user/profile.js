requireAuth();

/* ================= SOCKET ================= */

let socket;

function initSocket(userId){

 socket = io("http://localhost:5000",{
  transports:["websocket"],
  reconnection:true
 });

 socket.on("connect",()=>{
  console.log("Socket connected:", socket.id);
  socket.emit("register", userId);
 });

 socket.on("notification",(data)=>{
  console.log("🔔 New notification:", data);
  showRealtimeNotification(data);
 });

 socket.on("disconnect",(reason)=>{
  console.log("Socket disconnected:", reason);
 });
}


/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", init);

async function init(){
 try{
  await loadProfile();
  loadStats();
  loadVisitors();
  loadSuggestedUsers();
  loadNotifications();
  loadFeed();
  loadUnreadCount();

  // Enter key → add skill
  document.getElementById("skillInput")
  ?.addEventListener("keypress", e=>{
    if(e.key==="Enter") addSkill();
  });

  // Image preview
  document.getElementById("postImage")
  ?.addEventListener("change", previewImage);

 }catch(err){
  console.error(err);
 }
}


/* ================= API HELPERS ================= */

async function apiGet(url){
 const token = localStorage.getItem("accessToken");

 const res = await fetch(`/api${url}`,{
  headers:{ Authorization:`Bearer ${token}` }
 });

 if(!res.ok) throw new Error("GET failed");
 return res.json();
}

async function apiPost(url, body){
 const token = localStorage.getItem("accessToken");

 const res = await fetch(`/api${url}`,{
  method:"POST",
  headers: body instanceof FormData ? {
   Authorization:`Bearer ${token}`
  } : {
   "Content-Type":"application/json",
   Authorization:`Bearer ${token}`
  },
  body: body instanceof FormData ? body : JSON.stringify(body)
 });

 if(!res.ok) throw new Error("POST failed");
 return res.json();
}

async function apiPut(url, body){
 const token = localStorage.getItem("accessToken");

 const res = await fetch(`/api${url}`,{
  method:"PUT",
  headers:{
   "Content-Type":"application/json",
   Authorization:`Bearer ${token}`
  },
  body: JSON.stringify(body)
 });

 if(!res.ok) throw new Error("PUT failed");
 return res.json();
}

async function apiDelete(url){
 const token = localStorage.getItem("accessToken");

 const res = await fetch(`/api${url}`,{
  method:"DELETE",
  headers:{ Authorization:`Bearer ${token}` }
 });

 if(!res.ok) throw new Error("DELETE failed");
}


/* ================= PROFILE ================= */

async function loadProfile(){

 const user = await apiGet("/auth/me");

 // 🔥 INIT SOCKET ONCE
 if(!socket) initSocket(user._id);

 document.getElementById("name").innerText = user.name || "";
 document.getElementById("headline").innerText = user.headline || "";
 document.getElementById("location").innerText = user.location || "";
 document.getElementById("about").innerText = user.about || "";

 document.getElementById("email").innerText = user.email || "Not added";
 document.getElementById("phone").innerText = user.phone || "Not added";
 document.getElementById("address").innerText = user.address || "Not added";

 if(user.avatar){
  document.getElementById("profile-img").src = user.avatar;
 }

 if(user.cover){
  document.getElementById("cover-img").src = user.cover;
 }

 if(user.resume){
  const link = document.getElementById("resumeLink");
  link.href = user.resume;
  link.innerText = "View Resume";
 }

 renderSkills(user.skills || []);
}


/* ================= STATS ================= */

async function loadStats(){

 const data = await apiGet("/users/stats");

 document.getElementById("connectionCount").innerText =
  data.connections || 0;

 document.getElementById("visitorCount").innerText =
  data.visitors || 0;
}


/* ================= VISITORS ================= */

async function loadVisitors(){

 const visitors = await apiGet("/users/visitors");

 const container = document.getElementById("visitorsList");
 container.innerHTML="";

 visitors.forEach(v=>{
  const div = document.createElement("div");
  div.innerHTML = `
   <strong>${v.user?.name || "User"}</strong>
   <p>${v.user?.headline || ""}</p>
  `;
  container.appendChild(div);
 });
}


/* ================= SUGGESTED USERS ================= */

async function loadSuggestedUsers(){

 const users = await apiGet("/users/suggestions");

 const container = document.getElementById("suggestedUsers");
 container.innerHTML="";

 users.forEach(user=>{

  const div = document.createElement("div");

  div.innerHTML = `
   <p>${user.name}</p>
   <button onclick="followUser('${user._id}', this)">
    Follow
   </button>
  `;

  container.appendChild(div);
 });
}

window.followUser = async function(userId, btn){

 await apiPost(`/users/follow/${userId}`);

 btn.innerText = "Following";
 btn.disabled = true;
};


/* ================= SKILLS ================= */

function renderSkills(skills){

 const container = document.getElementById("skillsList");
 container.innerHTML = "";

 skills.forEach(s => {

  const wrapper = document.createElement("div");
  wrapper.className = "skill-item";

  const span = document.createElement("span");
  span.className = "skill-tag";
  span.innerText = s.name;

  const editBtn = document.createElement("button");
  editBtn.innerText = "✏️";
  editBtn.onclick = () => startEditSkill(wrapper, s);

  const deleteBtn = document.createElement("button");
  deleteBtn.innerText = "❌";
  deleteBtn.onclick = () => deleteSkill(s._id);

  wrapper.append(span, editBtn, deleteBtn);
  container.appendChild(wrapper);
 });
}

window.addSkill = async function(){

 const input = document.getElementById("skillInput");
 const name = input.value.trim();

 if(!name) return;

 await apiPost("/users/skills",{ name });

 input.value="";
 loadProfile();
};

async function deleteSkill(id){

 if(!confirm("Delete this skill?")) return;

 await apiDelete(`/users/skills/${id}`);
 loadProfile();
}

function startEditSkill(wrapper, skill){

 wrapper.innerHTML = "";

 const input = document.createElement("input");
 input.value = skill.name;

 const save = document.createElement("button");
 save.innerText = "✔";

 const cancel = document.createElement("button");
 cancel.innerText = "✖";

 save.onclick = async ()=>{
  const newName = input.value.trim();
  if(!newName) return;

  await apiPut(`/users/skills/${skill._id}`,{ name:newName });
  loadProfile();
 };

 cancel.onclick = () => loadProfile();

 wrapper.append(input, save, cancel);
}


/* ================= POSTS ================= */

async function loadFeed(){

 const posts = await apiGet("/posts/feed");

 const container = document.getElementById("feedPosts");
 container.innerHTML="";

 posts.forEach(renderPost);
}

async function submitPost(){

 const content = document.getElementById("postContent").value.trim();
 const image = document.getElementById("postImage").files[0];

 if(!content && !image) return;

 const formData = new FormData();
 if(content) formData.append("content",content);
 if(image) formData.append("image",image);

 const post = await apiPost("/posts", formData);

 renderPost(post);

 document.getElementById("postContent").value="";
 document.getElementById("postImage").value="";
 document.getElementById("imagePreview").innerHTML="";
}

function renderPost(post){

 const container = document.getElementById("feedPosts");

 const div = document.createElement("div");
 div.className="post-card";

 div.innerHTML = `
  <strong>${post.author?.name || "User"}</strong>
  <p>${post.content || ""}</p>
  ${post.image ? `<img src="${post.image}" class="post-image">` : ""}
 `;

 container.prepend(div);
}

function previewImage(){
 const file = this.files[0];
 if(!file) return;

 const url = URL.createObjectURL(file);

 document.getElementById("imagePreview").innerHTML =
  `<img src="${url}" style="max-width:100%;margin-top:10px;">`;
}


/* ================= 🔔 REALTIME NOTIFICATIONS ================= */

function showRealtimeNotification(data){

 const panel = document.getElementById("notificationPanel");

 const div = document.createElement("div");
 div.className = "notification-item";
 div.innerText = data.message;

 panel.prepend(div);

 showToast(data.message);
}

function showToast(message){

 const toast = document.createElement("div");
 toast.className = "toast";
 toast.innerText = message;

 document.body.appendChild(toast);

 setTimeout(() => toast.remove(), 3000);
}


/* ================= NOTIFICATIONS ================= */

async function loadNotifications(){

 const notifications = await apiGet("/notifications");

 const panel = document.getElementById("notificationPanel");
 panel.innerHTML="";

 notifications.forEach(n=>{
  const div = document.createElement("div");
  div.innerText = n.message;
  panel.appendChild(div);
 });
}

window.toggleNotifications = function(){
 document.getElementById("notificationPanel")
 .classList.toggle("hidden");
};




async function loadUnreadCount(){

 const data = await apiGet("/notifications/unread/count");

 document.getElementById("notifCount").innerText = data.count;
}


/* ================= LOGOUT ================= */

window.logout = async function(){

 await apiPost("/auth/logout");

 localStorage.removeItem("accessToken");

 window.location="/auth/login.html";
};


/* ================= TEMP SAFETY ================= */

window.addEducation = () => alert("Not implemented yet");
window.addProject = () => alert("Not implemented yet");
window.addCertificate = () => alert("Not implemented yet");