let candidates = [];
let distributionChart = null;

const jobSelect = document.getElementById("jobSelect");
const searchInput = document.getElementById("searchCandidate");
const sortSelect = document.getElementById("sortSelect");
const rankingGrid = document.getElementById("ranking");
const emptyState = document.getElementById("emptyState");
const rankingStats = document.getElementById("rankingStats");
const loadingOverlay = document.getElementById("loadingOverlay");

document.addEventListener("DOMContentLoaded", () => {
  if (!jobSelect) return;
  loadJobs();
});


async function apiFetch(endpoint) {
  try {
    const token = localStorage.getItem("accessToken");

    const res = await fetch(`http://localhost:5000/api${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      window.location.href = "/auth/login.html";
      return null;
    }

    if (!res.ok) throw new Error("API error");

    return await res.json();
  } catch (err) {
    console.error("API Fetch Error:", err);
    return null;
  }
}


async function loadJobs() {
  try {
    showLoading(true);

    const jobs = await apiFetch("/jobs/my"); 
    if (!jobs || !jobSelect) return;

    jobSelect.innerHTML = `<option value="">Select Job</option>`;

    jobs.forEach(job => {
      const option = document.createElement("option");
      option.value = job._id;
      option.textContent = job.title;
      jobSelect.appendChild(option);
    });

  } catch (err) {
    console.error("Failed to load jobs", err);
  } finally {
    showLoading(false);
  }
}


jobSelect?.addEventListener("change", async () => {

  if (!jobSelect.value) return;

  try {
    showLoading(true);

    const data = await apiFetch(`/applications/recruiter?job=${jobSelect.value}`);
    if (!data) return;

    candidates = data;

    applySort();
    renderDistributionChart(candidates);

  } catch (err) {
    console.error("Failed to load ranking", err);
  } finally {
    showLoading(false);
  }
});

sortSelect?.addEventListener("change", applySort);

function applySort() {
  if (!candidates.length) return;

  if (sortSelect?.value === "score") {
    candidates.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  } else {
    candidates.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }

  renderCandidates(candidates);
}


searchInput?.addEventListener("input", () => {

  const query = searchInput.value.toLowerCase();

  const filtered = candidates.filter(c =>
    (c.name || "").toLowerCase().includes(query)
  );

  renderCandidates(filtered);
});


function renderCandidates(list) {

  if (!rankingGrid) return;

  rankingGrid.innerHTML = "";

  if (!list.length) {
    emptyState?.classList.remove("hidden");
    if (rankingStats) rankingStats.innerText = "";
    return;
  }

  emptyState?.classList.add("hidden");

  const avg =
    list.reduce((sum, c) => sum + (c.totalScore || 0), 0) /
    list.length;

  if (rankingStats) {
    rankingStats.innerText =
      `${list.length} candidates • Avg Score: ${avg.toFixed(1)}%`;
  }

  list.forEach((candidate, index) => {

    const safeUrl = encodeURI(candidate.resumeUrl || "");

    const card = document.createElement("div");
    card.className = "candidate-card";

    if (index === 0) card.classList.add("top");

    card.innerHTML = `
      <div class="candidate-header">
        <span class="candidate-name">
          ${sanitize(candidate.name || "Unknown")}
        </span>

        <span class="score-badge ${getScoreClass(candidate.totalScore || 0)}">
          ${candidate.totalScore || 0}%
        </span>
      </div>

      <div class="score-bar-container">
        <div class="score-bar"
             style="width:${candidate.totalScore || 0}%">
        </div>
      </div>

      <div class="match-breakdown">
        ${renderBreakdown(candidate)}
      </div>

      <button class="view-btn"
              data-resume="${safeUrl}">
        View Resume
      </button>
    `;

    rankingGrid.appendChild(card);
  });
}


function renderBreakdown(candidate) {

  if (!candidate.breakdown) return "";

  return `
    ${breakdownItem("Skills", candidate.breakdown.skills)}
    ${breakdownItem("Experience", candidate.breakdown.experience)}
    ${breakdownItem("Culture", candidate.breakdown.culture)}
  `;
}

function breakdownItem(label, value = 0) {
  return `
    <div class="breakdown-item">
      <span>${label}</span>
      <div class="mini-bar">
        <div class="mini-fill" style="width:${value}%"></div>
      </div>
    </div>
  `;
}


function getScoreClass(score) {
  if (score >= 85) return "score-high";
  if (score >= 65) return "score-medium";
  return "score-low";
}


function renderDistributionChart(list) {

  const ctx = document.getElementById("distributionChart");
  if (!ctx) return;

  if (distributionChart) distributionChart.destroy();

  const ranges = {
    "0-50": 0,
    "51-70": 0,
    "71-85": 0,
    "86-100": 0
  };

  list.forEach(c => {
    const score = c.totalScore || 0;

    if (score <= 50) ranges["0-50"]++;
    else if (score <= 70) ranges["51-70"]++;
    else if (score <= 85) ranges["71-85"]++;
    else ranges["86-100"]++;
  });

  distributionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(ranges),
      datasets: [{
        data: Object.values(ranges)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}


document.addEventListener("click", (e) => {

  if (e.target.classList.contains("view-btn")) {

    const url = e.target.dataset.resume;

    const frame = document.getElementById("resumeFrame");
    const modal = document.getElementById("resumeModal");

    if (frame && modal) {
      frame.src = url;
      modal.classList.remove("hidden");
    }
  }
});

document.getElementById("closeResumeBtn")?.addEventListener("click", () => {
  document.getElementById("resumeModal")?.classList.add("hidden");
  document.getElementById("resumeFrame").src = "";
});


function sanitize(str) {
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

function showLoading(state) {
  if (!loadingOverlay) return;
  loadingOverlay.classList.toggle("hidden", !state);
}