function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[tag]));
}


/* ================= SOCKET ================= */

const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("accessToken")
  }
});

/* ================= STATE ================= */

let notifications = [];
let currentFilter = "all";

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {

    await loadNotifications();

    const user = await apiFetch("/auth/me");

    socket.emit("join", user._id);

  } catch (err) {
    console.error("Init error:", err);
  }
});

/* ================= LOAD ================= */

async function loadNotifications() {
  try {

    const data = await apiFetch("/notifications");

    notifications = data.notifications || data;

    renderNotifications();
    updateBadge();

  } catch (err) {
    console.error("Notification load error:", err);
  }
}

/* ================= RENDER ================= */

function renderNotifications() {

  const container = document.getElementById("notificationsList");
  if (!container) return;

  container.innerHTML = "";

  const filtered = notifications.filter(n => {

    if (currentFilter === "all") return true;

    if (currentFilter === "job") {
      return n.type.includes("job");
    }

    if (currentFilter === "connection") {
      return n.type.includes("connection");
    }

    if (currentFilter === "engagement") {
      return n.type === "post_like" || n.type === "post_comment";
    }

    if (currentFilter === "message") {
      return n.type === "message";
    }

    if (currentFilter === "system") {
      return n.type === "system";
    }

    return false;
  });

  if (!filtered.length) {
    container.innerHTML = "<p>No notifications</p>";
    return;
  }

  filtered.forEach(n => {

    const div = document.createElement("div");
    div.className = `notification ${n.read ? "" : "unread"}`;

    div.innerHTML = `
      <div class="notification-icon">${getIcon(n.type)}</div>

      <div class="notification-content"
           onclick="goToLink('${n.link || "#"}')">

        <p>${formatMessage(n)}</p>
        <small>${formatTime(n.createdAt)}</small>

      </div>

      ${!n.read
        ? `<button onclick="markRead('${n._id}')">✔</button>`
        : ""
      }
    `;

    container.appendChild(div);
  });
}

/* ================= FILTER ================= */

function filterType(type) {
  currentFilter = type;
  renderNotifications();
}
window.filterType = filterType;

/* ================= MARK READ ================= */

async function markRead(id) {
  try {

    await apiFetch(`/notifications/read/${id}`, {
      method: "PUT"
    });

    const notif = notifications.find(n => n._id === id);
    if (notif) notif.read = true;

    renderNotifications();
    updateBadge();

  } catch (err) {
    console.error("Mark read error:", err);
  }
}

/* ================= MARK ALL ================= */

async function markAllRead() {
  try {

    await apiFetch("/notifications/read/all", {
      method: "PUT"
    });

    notifications.forEach(n => n.read = true);

    renderNotifications();
    updateBadge();

  } catch (err) {
    console.error("Mark all read error:", err);
  }
}

/* ================= BADGE ================= */

function updateBadge() {

  const badge = document.getElementById("notificationBadge");
  if (!badge) return;

  const unread = notifications.filter(n => !n.read).length;

  badge.innerText = unread > 99 ? "99+" : unread;
  badge.style.display = unread ? "inline-block" : "none";
}

/* ================= SOCKET ================= */

socket.on("newNotification", notification => {

  console.log("🔔 New notification:", notification);

  if (!notifications.find(n => n._id === notification._id)) {
  notifications.unshift(notification);
}

  renderNotifications();
  updateBadge();

  showToast(notification.message);
});

/* ================= NAVIGATION ================= */

function goToLink(link) {
  if (link && link !== "#") {
    window.location.href = link;
  }
}

/* ================= TOAST ================= */

function showToast(message) {

  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/* ================= ICON ================= */

function getIcon(type) {

  if (type.includes("job")) return "💼";

  if (type.includes("connection")) return "🤝";

  if (type === "post_like" || type === "post_comment")
    return "👍";

  if (type === "message") return "💬";

  if (type === "system") return "⚙️";

  return "🔔";
}

/* ================= MESSAGE ================= */
function formatMessage(n) {

  if (n.sender?.name) {
    return `<strong>${escapeHTML(n.sender.name)}</strong> ${escapeHTML(n.message)}`;
  }

  return escapeHTML(n.message);
}

/* ================= TIME ================= */

function formatTime(date) {

  const d = new Date(date);
  const diff = Date.now() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return `${days}d ago`;
}

/* ================= INIT LOAD ================= */
window.addEventListener("beforeunload", () => {
  socket.disconnect();
});


if (notification.type === "message") {
  // skip if already in chat page
  if (window.location.pathname.includes("messages.html")) return;
}