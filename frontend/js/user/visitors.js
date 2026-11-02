const API = "http://localhost:5000/api";
const token = localStorage.getItem("accessToken");

if (!token) {
  window.location.href = "../auth/login.html";
}

const visitorsList = document.getElementById("visitorsList");
const emptyState = document.getElementById("emptyState");
const logoutBtn = document.getElementById("logoutBtn");
const notifCountEl = document.getElementById("notifCount");

const socket = io("http://localhost:5000");

let notificationCount = 0;

init();

async function init() {
  await loadVisitors();
  loadComparison();
  loadYoY();
  setupSocket();
}

// ================= FETCH =================
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!res.ok) {
    console.error("API error");
    return null;
  }

  return res.json();
}

// ================= LOAD VISITORS =================
async function loadVisitors() {

  const visitors = await apiFetch("/users/visitors");

  if (!visitors || visitors.length === 0) {
    emptyState.style.display = "block";
    visitorsList.innerHTML = "";
    return;
  }

  emptyState.style.display = "none";
  visitorsList.innerHTML = "";

  const fragment = document.createDocumentFragment();

  visitors.forEach(v => {

    const card = document.createElement("div");
    card.className = "visitor-card";
    card.dataset.id = v.user._id;

    if (v.visitCount > 1) {
      card.classList.add("repeat-visitor");
    }

    card.innerHTML = `
      <div class="visitor-avatar">
        ${sanitize(v.user.name.charAt(0))}
      </div>

      <div class="visitor-info">
        <h4>
          ${sanitize(v.user.name)}
          ${v.visitCount > 1 ? '<span class="repeat-badge">⭐ Frequent</span>' : ''}
        </h4>
        <span>${sanitize(v.user.title || "Professional")}</span>
      </div>

      <div class="visit-time">
        ${timeAgo(v.viewedAt)}
      </div>

      <button class="message-btn">📩</button>
    `;

    fragment.appendChild(card);
  });

  visitorsList.appendChild(fragment);
}

// ================= EVENT DELEGATION =================
visitorsList.addEventListener("click", (e) => {

  const card = e.target.closest(".visitor-card");
  if (!card) return;

  const visitorId = card.dataset.id;

  if (e.target.classList.contains("message-btn")) {
    window.location.href = `message.html?user=${visitorId}`;
  } else {
    window.location.href = `visitor.html?id=${visitorId}`;
  }

});

// ================= REAL-TIME SOCKET =================
function setupSocket() {

  socket.emit("register", token);

  socket.on("profileViewed", (data) => {
    showPopup(`${data.viewerName} viewed your profile 👀`);
  });

  socket.on("newNotification", () => {
    notificationCount++;
    if (notifCountEl) {
      notifCountEl.innerText = notificationCount;
    }
  });
}

// ================= MONTHLY COMPARISON =================
async function loadComparison() {

  const data = await apiFetch("/users/visitors/stats/compare");
  if (!data) return;

  const container = document.getElementById("comparisonStats");
  if (!container) return;

  container.innerHTML = `
    <p>This Month: <strong>${data.currentMonth}</strong></p>
    <p>Last Month: <strong>${data.lastMonth}</strong></p>
    <p>
      Growth:
      <strong style="color:${data.growth >= 0 ? 'green' : 'red'}">
        ${data.growth}%
      </strong>
    </p>
  `;
}

// ================= YEAR-OVER-YEAR =================
async function loadYoY() {

  const data = await apiFetch("/users/visitors/stats/yoy");
  if (!data) return;

  const container = document.getElementById("yoyStats");
  if (!container) return;

  container.innerHTML = `
    <p>This Year: <strong>${data.currentYear}</strong></p>
    <p>Last Year: <strong>${data.lastYear}</strong></p>
    <p>
      Growth:
      <strong style="color:${data.growth >= 0 ? 'green' : 'red'}">
        ${data.growth}%
      </strong>
    </p>
  `;
}

// ================= POPUP =================
function showPopup(message) {
  let popup = document.getElementById("popup");

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popup";
    popup.className = "popup";
    document.body.appendChild(popup);
  }

  popup.innerText = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

// ================= LOGOUT =================
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../auth/login.html";
  });
}

// ================= UTILITIES =================
function sanitize(str) {
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