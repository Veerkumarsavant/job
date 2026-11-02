const API = "http://localhost:5000/api";

const token = localStorage.getItem("accessToken");

if (!token) {
  window.location.href = "/auth/login.html";
}

let socket,
  growthChart,
  statusChart,
  aiChart,
  funnelChart,
  refreshInterval;

const $ = id => document.getElementById(id);

const dateRange = $("dateRange");
const jobFilter = $("jobFilter");
const loadingOverlay = $("loadingOverlay");
const applicationsEl = $("totalApplicants");

let lastToastTime = 0;

document.addEventListener("DOMContentLoaded", async () => {
  initSocket();
  initEvents();

  await loadJobs();
  await loadAnalytics();

  startAutoRefresh();
});

function initSocket() {

  socket = io("http://localhost:5000", {
    auth: { token },
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    console.log("✅ Socket:", socket.id);
  });

  socket.on("newApplicant", data => {
    handleRealtimeUpdate({
      type: "newApplicant",
      jobTitle: data?.job?.title || "Job"
    });
  });

  socket.on("applicationStatusUpdated", () => {
    handleRealtimeUpdate({
      type: "statusUpdate"
    });
  });
}

function initEvents() {

  dateRange?.addEventListener("change",loadAnalytics);
  jobFilter?.addEventListener("change",loadAnalytics);
  window.addEventListener( "beforeunload", () => {
      clearInterval(refreshInterval);
      if (socket?.connected) {
        socket.disconnect();
      }
    }
  );
}

function startAutoRefresh() {
  clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
  if (!document.hidden) {
    loadAnalytics();
  }

}, 30000);
}

async function apiFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      window.location.href ="/auth/login.html";
      return null;
    }

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function showLoading(state) {
  if (!loadingOverlay) return;

  loadingOverlay.style.display =state ? "flex" : "none";
}

async function loadJobs() {
  const jobs = await apiFetch(`${API}/jobs/my`);
  if (!jobs || !jobFilter) return;
  jobFilter.innerHTML =`<option value="all">All Jobs</option>`;
  jobs.forEach(job => {
    const opt =document.createElement("option");
    opt.value = job._id;
    opt.textContent = job.title;
    jobFilter.appendChild(opt);
  });
}

async function loadAnalytics() {
  try {
    showLoading(true);
    const appsRes = await apiFetch(`${API}/applications/recruiter`);
    const stats = await apiFetch(`${API}/recruiter/stats` );

    if (!appsRes || !stats) return;

    let apps = appsRes.data || [];

    if (dateRange?.value) {

     const days =
  Number(dateRange.value) || 30;

const cutoff =
  new Date(Date.now() - (
    days * 24 * 60 * 60 * 1000
  ));

      apps = apps.filter(a => {

  if (!a.createdAt) {
    return false;
  }

  return (
    new Date(a.createdAt).getTime() >=
    cutoff.getTime()
  );

});
    }

    if (
      jobFilter?.value !== "all"
    ) {

      apps = apps.filter(
        a =>
          a.job?._id ===
          jobFilter.value
      );
    }

    const total = apps.length;

    const applied = apps.filter(
  a =>
    a.status?.toLowerCase() === "applied"
).length;

const accepted = apps.filter(
  a =>
    a.status?.toLowerCase() === "accepted"
).length;

const rejected = apps.filter(
  a =>
    a.status?.toLowerCase() === "rejected"
).length;
    const conversion =
      total > 0
        ? Math.round(
            (accepted / total) * 100
          )
        : 0;

    const data = {
      totalApplicants: total,
      applied,
      accepted,
      rejected,
      conversion,
      growth: buildGrowth(apps),
      status: {
        Applied: applied,
        Accepted: accepted,
        Rejected: rejected
      },

      aiUsage: {
        labels: [
          "Used AI",
          "Not Used"
        ],

        values: [
          stats.aiUsed || 0,
          stats.aiNotUsed || 0
        ]
      },

      funnel: [
        total,
        applied,
        accepted,
        stats.hired || 0
      ]
    };

    updateMetrics(data);
    updateCharts(data);

  } finally {
    showLoading(false);
  }
}

function animateNumber(el, target) {
  if (!el) return;

  let start = parseInt(el.innerText) || 0;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / 400, 1);
    el.innerText = Math.floor(
      start +
      (target - start) * progress
    );

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function updateMetrics(data) {

  animateNumber(
    applicationsEl,
    data.totalApplicants
  );

  animateNumber(
    $("scheduledCount"),
    data.applied
  );

  animateNumber(
    $("completedCount"),
    data.accepted
  );

  $("conversionRate").innerText =
    data.conversion + "%";
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
};

function renderFunnelChart(funnel) {

  const ctx =
    document.getElementById(
      "funnelChart"
    );

  if (!ctx) return;

  const values = [
    Number(funnel[0]) || 0,
    Number(funnel[1]) || 0,
    Number(funnel[2]) || 0,
    Number(funnel[3]) || 0
  ];

  if (funnelChart) {
    funnelChart.destroy();
  }

  funnelChart = new Chart(ctx, {

    type: "bar",

    data: {

      labels: [
        "Applicants",
        "Applied",
        "Accepted",
        "Hired"
      ],

      datasets: [{
        label: "Hiring Funnel",
        data: values,
        borderWidth: 1
      }]
    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      indexAxis: "y",

      scales: {
        x: {
          beginAtZero: true
        }
      },

      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderGrowthChart(growth) {

  const ctx =
    document.getElementById(
      "growthChart"
    );

  if (!ctx || !growth) return;

  if (growthChart) {
    growthChart.destroy();
  }

  growthChart = new Chart(ctx, {

    type: "line",

    data: {

      labels: growth.labels,

      datasets: [{
        label: "Applicants",
        data: growth.values,
        tension: 0.4,
        fill: true
      }]
    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
function renderStatusChart(status) {

  const ctx = $("statusChart");

  if (!ctx) return;

  const values = [
    status.Applied,
    status.Accepted,
    status.Rejected
  ];

  if (!statusChart) {

    statusChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "Applied",
          "Accepted",
          "Rejected"
        ],
        datasets: [{
          data: values
        }]
      },
      options: chartOptions
    });

  } else {

    statusChart.data.datasets[0].data =
      values;

    statusChart.update();
  }
}

function renderAIChart(ai) {

  const ctx = $("aiChart");

  if (!ctx) return;

  if (!aiChart) {

    aiChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ai.labels,
        datasets: [{
          data: ai.values
        }]
      },
      options: chartOptions
    });

  } else {

    aiChart.data.datasets[0].data =
      ai.values;

    aiChart.update();
  }
}



function updateCharts(data) {

  renderGrowthChart(data.growth);

  renderStatusChart(data.status);

  renderAIChart(data.aiUsage);

  renderFunnelChart(data.funnel);
}

function handleRealtimeUpdate(data) {

  if (data.type === "newApplicant") {

    animateNumber(
      applicationsEl,
      Number(applicationsEl.innerText) + 1
    );

    showToast(
      `New applicant for ${data.jobTitle}`
    );
  }

  setTimeout(loadAnalytics, 500);
}

function showToast(msg) {

  const now = Date.now();

  if (now - lastToastTime < 2000) {
    return;
  }

  lastToastTime = now;

  const toast =
    document.createElement("div");

  toast.className =
    "analytics-toast";

  toast.innerText = msg;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function buildGrowth(apps) {

  const map = {};

  apps.forEach(app => {

    if (!app.createdAt) return;

    const d =
      new Date(app.createdAt)
      .toISOString()
      .split("T")[0];

    map[d] = (map[d] || 0) + 1;
  });

  const labels =
    Object.keys(map).sort();

  return {
    labels,
    values: labels.map(
      d => map[d]
    )
  };
}