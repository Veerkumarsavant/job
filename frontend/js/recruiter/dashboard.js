let jobsChart = null;
let trendChart = null;
let reloadTimer = null;
let socket = null;

/* ================= INIT ================= */
/*document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof requireAuth !== "function") {
      throw new Error("requireAuth not available");
    }

    //const user = await requireAuth("recruiter");

    if (!user) {
      window.location.href = "/auth/login.html";
      return;
    }

    initUI();
    initSocket();
    loadDashboard();

  } catch (err) {
    console.error("Initialization error:", err);
    window.location.href = "/auth/login.html";
  }
});*/

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    window.location.href = "/auth/login.html";
    return;
  }

  initUI();
  initSocket();
  loadDashboard();
});

/* ================= UI ================= */
function initUI() {
const themeBtn = document.getElementById("themeBtn");
if (localStorage.getItem("recruiterTheme") === "dark") {
  document.body.classList.add("dark-mode");
}

themeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  const isDark = document.body.classList.contains("dark-mode");

  localStorage.setItem("recruiterTheme", isDark ? "dark" : "light");
});

  if (localStorage.getItem("recruiterTheme") === "dark") {
    document.body.classList.add("dark-mode");
  }

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    localStorage.removeItem("accessToken");
    window.location.href = "/auth/login.html";
  });

  document.getElementById("rankingBtn")?.addEventListener("click", goToRanking);

  document.getElementById("jobIdInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") goToRanking();
  });
}

/* ================= AUTH ================= */
function getToken() {
  return localStorage.getItem("accessToken");
}

function redirectToLogin() {
  localStorage.removeItem("accessToken");
  window.location.href = "/auth/login.html";
}

/* ================= API ================= */
async function fetchWithAuth(url) {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("API failed:", text);
      throw new Error("API failed");
    }

    return await res.json();

  } catch (err) {
    console.error("API Error:", url, err);
    return null;
  }
}

/* ================= DASHBOARD ================= */
async function loadDashboard() {
  try {
    const result = await fetchWithAuth("/api/applications/recruiter");
    if (!result) return;

    const applications = result.data || [];

    renderMetrics(applications);
    renderTrendChart(applications);

    const jobMap = buildJobMapFromApps(applications);
    renderJobsChart(jobMap);
    renderJobList(jobMap);

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
}

/* ================= DATA ================= */
function buildJobMapFromApps(applications) {
  const map = new Map();

  applications.forEach(app => {
    const job = app.job;
    if (!job) return;

    if (!map.has(job._id)) {
      map.set(job._id, {
        title: job.title,
        count: 0
      });
    }

    map.get(job._id).count++;
  });

  return map;
}

/* ================= METRICS ================= */
function renderMetrics(applications = []) {
  setText("totalApplicants", applications.length);

  const interviews = applications.filter(a => a.status === "accepted");
  setText("interviews", interviews.length);

  const uniqueJobs = new Set(
    applications.map(a => a.job?._id).filter(Boolean)
  );

  setText("totalJobs", uniqueJobs.size);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

/* ================= CHARTS ================= */
function renderJobsChart(jobMap) {
  const labels = Array.from(jobMap.values()).map(j => j.title);
  const data = Array.from(jobMap.values()).map(j => j.count);

  const canvas = document.getElementById("jobsChart");
  if (!canvas) return;

  if (!labels.length) {
    canvas.parentElement.innerHTML = "<p>No data available</p>";
    return;
  }

  if (jobsChart) jobsChart.destroy();

  const ctx = canvas.getContext("2d");

  jobsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Applicants",
        data
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderTrendChart(applications) {
  if (!applications.length) return;

  const days = {};

  applications.forEach(app => {
    const date = new Date(app.createdAt).toLocaleDateString("en-CA");
    days[date] = (days[date] || 0) + 1;
  });

  const labels = Object.keys(days).sort();
  const data = labels.map(d => days[d]);

  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  if (!labels.length) {
    canvas.parentElement.innerHTML = "<p>No data available</p>";
    return;
  }

  if (trendChart) trendChart.destroy();

  const ctx = canvas.getContext("2d");

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Applications",
        data,
        fill: false,
        tension: 0.4
      }]
    },
    options: {
      responsive: true
    }
  });
}

/* ================= JOB LIST ================= */
function renderJobList(jobMap) {
  const container = document.getElementById("jobList");
  if (!container) return;

  const entries = Array.from(jobMap.entries());

  if (!entries.length) {
    container.innerHTML = "<p>No jobs found</p>";
    return;
  }

  container.innerHTML = entries.map(([id, job]) => `
    <div class="job-item" data-id="${id}">
      <strong>${escapeHTML(job.title)}</strong>
      <span> (${job.count} applicants)</span>
    </div>
  `).join("");

  container.onclick = handleJobClick;
}

function handleJobClick(e) {
  const el = e.target.closest(".job-item");
  if (!el) return;

  goToJob(el.dataset.id);
}

/* ================= NAVIGATION ================= */
function goToJob(jobId) {
  if (!isValidObjectId(jobId)) {
    alert("Invalid Job ID");
    return;
  }

  window.location.href = `./candidate-ranking.html?jobId=${jobId}`;
}

function goToRanking() {
  const input = document.getElementById("jobIdInput");
  if (!input) return;

  const jobId = input.value.trim();

  if (!jobId) {
    alert("Enter Job ID");
    return;
  }

  goToJob(jobId);
}

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/* ================= SECURITY ================= */
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[tag]));
}

/* ================= SOCKET ================= */
function initSocket() {
  if (socket || typeof io === "undefined") return;

  const token = getToken();
  if (!token) return;

  const BASE_URL = window.location.origin;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket error:", err.message);
    if (err.message === "Authentication error") {
      redirectToLogin();
    }
  });

  socket.on("analyticsUpdate", safeReload);
  socket.on("applicationStatusUpdated", safeReload);

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });
}

/* ================= RELOAD ================= */
function safeReload() {
  if (reloadTimer) return;

  reloadTimer = setTimeout(() => {
    loadDashboard();
    reloadTimer = null;
  }, 500);
}