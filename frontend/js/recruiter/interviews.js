/*const token = localStorage.getItem("accessToken");
const jobSelect = document.getElementById("jobSelect");
const candidateSelect = document.getElementById("candidateSelect");
const list = document.getElementById("interviewList");
const statusMsg = document.getElementById("statusMsg");

document.addEventListener("DOMContentLoaded", () => {
  loadJobs();
  loadInterviews();
});

async function loadJobs() {
  const res = await fetch("/api/jobs/my", {
    headers: { Authorization: "Bearer " + token }
  });

  const jobs = await res.json();

  jobSelect.innerHTML = `<option value="">Select Job</option>` +
    jobs.map(j => `<option value="${j._id}">${j.title}</option>`).join("");
}

jobSelect.addEventListener("change", async () => {
  const jobId = jobSelect.value;

  if (!jobId) return;

  const res = await fetch("/api/applications/recruiter", {
    headers: { Authorization: "Bearer " + token }
  });

  const apps = await res.json();

  const filtered = apps.filter(a => a.job._id === jobId);

  candidateSelect.innerHTML =
    `<option value="">Select Candidate</option>` +
    filtered.map(a =>
      `<option value="${a.applicant._id}">
        ${a.applicant.name} (${a.applicant.email})
      </option>`
    ).join("");
});


async function scheduleInterview() {
  const jobId = jobSelect.value;
  const candidateId = candidateSelect.value;
  const date = document.getElementById("date").value;

  if (!jobId || !candidateId || !date) {
    statusMsg.innerText = "Fill all fields";
    return;
  }

  try {
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ jobId, candidateId, date })
    });

    if (!res.ok) throw new Error();

    statusMsg.innerText = "✅ Interview Scheduled";

    loadInterviews();

  } catch {
    statusMsg.innerText = "❌ Failed";
  }
}


async function loadInterviews() {
  const res = await fetch("/api/interviews", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (!data.length) {
    list.innerHTML = "<p>No interviews</p>";
    return;
  }

  list.innerHTML = data.map(i => `
    <div class="job-item">
      <strong>${i.job.title}</strong><br>
      ${i.candidate.name}<br>
      ${new Date(i.date).toLocaleString()}
    </div>
  `).join("");
}

flatpickr("#date", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  minDate: "today"
});


const socket = io({ auth: { token } });

socket.on("interviewScheduled", () => {
  loadInterviews();
});*/


const token = localStorage.getItem("accessToken");

const jobSelect = document.getElementById("jobSelect");
const candidateSelect = document.getElementById("candidateSelect");
const list = document.getElementById("interviewList");
const statusMsg = document.getElementById("statusMsg");

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "/auth/login.html";
    return;
  }

  loadJobs();
  loadInterviews();
  initSocket();
});

/* ================= HELPERS ================= */
function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, t => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[t]));
}

async function fetchWithAuth(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: "Bearer " + token
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/auth/login.html";
      return null;
    }

    if (!res.ok) throw new Error();

    return await res.json();

  } catch {
    return null;
  }
}

/* ================= JOBS ================= */
async function loadJobs() {
  const data = await fetchWithAuth("/api/jobs/my");
  if (!data) return;

  const jobs = data.data || data;

  jobSelect.innerHTML =
    `<option value="">Select Job</option>` +
    jobs.map(j =>
      `<option value="${j._id}">
        ${escapeHTML(j.title)}
      </option>`
    ).join("");
}

/* ================= CANDIDATES ================= */
jobSelect?.addEventListener("change", async () => {
  const jobId = jobSelect.value;
  if (!jobId) return;

  const data = await fetchWithAuth("/api/applications/recruiter");
  if (!data) return;

  const apps = data.data || data;

  const filtered = apps.filter(a => a.job?._id === jobId);

  candidateSelect.innerHTML =
    `<option value="">Select Candidate</option>` +
    filtered.map(a =>
      `<option value="${a.applicant._id}">
        ${escapeHTML(a.applicant.name)} (${escapeHTML(a.applicant.email)})
      </option>`
    ).join("");
});

/* ================= SCHEDULE ================= */
async function scheduleInterview() {
  const jobId = jobSelect.value;
  const candidateId = candidateSelect.value;
  const date = document.getElementById("date").value;

  if (!jobId || !candidateId || !date) {
    statusMsg.innerText = "Fill all fields";
    return;
  }

  const res = await fetchWithAuth("/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, candidateId, date })
  });

  if (!res) {
    statusMsg.innerText = "❌ Failed";
    return;
  }

  statusMsg.innerText = "✅ Interview Scheduled";
  loadInterviews();
}

/* ================= INTERVIEWS ================= */
async function loadInterviews() {
  const data = await fetchWithAuth("/api/interviews");
  if (!data) return;

  const interviews = data.data || data;

  if (!interviews.length) {
    list.innerHTML = "<p>No interviews</p>";
    return;
  }

  list.innerHTML = interviews.map(i => `
    <div class="job-item">
      <strong>${escapeHTML(i.job?.title)}</strong><br>
      ${escapeHTML(i.candidate?.name)}<br>
      ${new Date(i.date).toLocaleString()}
    </div>
  `).join("");
}

/* ================= DATE PICKER ================= */
flatpickr("#date", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  minDate: "today"
});

/* ================= SOCKET ================= */
function initSocket() {
  if (!token || typeof io === "undefined") return;

  const socket = io(window.location.origin, {
    auth: { token }
  });

  socket.on("interviewScheduled", loadInterviews);
}