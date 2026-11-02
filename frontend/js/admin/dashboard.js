let growthChart, aiChart, revenueChart;
let refreshInterval;
let isLoading = false;

document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();

  document.getElementById("dateRange")
    ?.addEventListener("change", loadAdminData);

  refreshInterval = setInterval(() => {
    if (!document.hidden) loadAdminData();
  }, 30000);
});

window.addEventListener("beforeunload", () => {
  if (refreshInterval) clearInterval(refreshInterval);
});

function setLoading(isLoading) {
  ["totalUsers", "totalJobs", "totalPosts"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (isLoading) el.innerText = "...";
  });
}

async function loadAdminData() {
  if (isLoading) return;
  isLoading = true;

  try {
    setLoading(true);

    const days = document.getElementById("dateRange")?.value || 30;
    const data = await api(`/admin/analytics?days=${days}`);

    updateMetrics(data);
    renderCharts(data);

  } catch (err) {
    console.error("Dashboard error:", err);

    if (err.status === 401 || err.message?.includes("401")) {
      localStorage.clear();
      window.location.href = "/auth/login.html";
      return;
    }

    showToast("Failed to load dashboard");
  } finally {
    isLoading = false;
    setLoading(false);
  }
}

function updateMetrics(data) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val ?? 0;
  };

  set("totalUsers", data.totalUsers);
  set("totalJobs", data.totalJobs);
  set("totalPosts", data.totalPosts);
}

function renderCharts(data) {
  const fallback = [
    { _id: "Users", count: data.totalUsers || 0 },
    { _id: "Jobs", count: data.totalJobs || 0 },
    { _id: "Posts", count: data.totalPosts || 0 }
  ];

  renderGrowthChart(data.userGrowth || fallback);
  renderAIChart(data.aiUsage || fallback);
  renderRevenueChart(
    data.revenue || fallback.map(d => ({ _id: d._id, total: d.count }))
  );
}

function getChartColors() {
  const dark = document.body.classList.contains("dark");

  return {
    text: dark ? "#e2e8f0" : "#334155",
    grid: dark ? "#334155" : "#e5e7eb",
    primary: "#6366f1",
    secondary: dark ? "#60a5fa" : "#2563eb",
    success: "#22c55e"
  };
}

function renderGrowthChart(dataset) {
  if (!dataset || dataset.length === 0) {
    console.warn("No data for growth chart");
    return;
  }

  const ctx = document.getElementById("growthChart")?.getContext("2d");
  if (!ctx) return;

  const c = getChartColors();

  const labels = dataset.map(d => d._id);
  const data = dataset.map(d => d.count);

  if (growthChart) {
    growthChart.data.labels = labels;
    growthChart.data.datasets[0].data = data;
    growthChart.update();
    return;
  }

  growthChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "User Growth",
        data,
        borderColor: c.primary,
        backgroundColor: `${c.primary}33`,
        fill: true,
        tension: 0.3
      }]
    },
    options: chartOptions(c)
  });
}

/* ================= AI ================= */
function renderAIChart(dataset) {
  const ctx = document.getElementById("aiChart");
  if (!ctx) return;

  if (aiChart) aiChart.destroy();

  const c = getChartColors();

  aiChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dataset.map(d => d._id),
      datasets: [{
        label: "AI Usage",
        data: dataset.map(d => d.count),
        backgroundColor: c.secondary
      }]
    },
    options: chartOptions(c)
  });
}

/* ================= REVENUE ================= */
function renderRevenueChart(dataset) {
  const ctx = document.getElementById("revenueChart");
  if (!ctx) return;

  if (revenueChart) revenueChart.destroy();

  const c = getChartColors();

  revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dataset.map(d => d._id),
      datasets: [{
        label: "Revenue",
        data: dataset.map(d => d.total),
        borderColor: c.success,
        backgroundColor: "rgba(34,197,94,0.2)",
        fill: true,
        tension: 0.3
      }]
    },
    options: chartOptions(c)
  });
}

/* ================= COMMON OPTIONS ================= */
function chartOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: c.text }
      }
    },
    scales: {
      x: {
        ticks: { color: c.text },
        grid: { color: c.grid }
      },
      y: {
        ticks: { color: c.text },
        grid: { color: c.grid }
      }
    }
  };
}

/* ================= TOAST ================= */
function showToast(msg) {
  const t = document.createElement("div");
  t.innerText = msg;

  Object.assign(t.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#ef4444",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: "8px",
    zIndex: 999
  });

  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}