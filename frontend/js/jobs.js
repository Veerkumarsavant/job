let page = 1;
let loading = false;
let appliedJobs = new Set();
let renderedJobIds = new Set();

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    window.location = "/auth/login.html";
    return;
  }

  await loadAppliedJobs();
  await loadJobs(true);
  loadRecommendedJobs();

  setupEventListeners();
});

async function loadAppliedJobs() {
  try {
    const ids = await apiGet("/applications/applied");
    appliedJobs = new Set(ids);
  } catch (err) {
    console.error("Applied jobs error:", err);
  }
}

async function loadJobs(reset = false) {
  if (loading) return;
  loading = true;

  const container = document.getElementById("jobsList");

  if (reset) {
    page = 1;
    container.innerHTML = "<p>Loading...</p>";
    renderedJobIds.clear();
  }

  try {
    const keyword = document.getElementById("keyword")?.value || "";
    const location = document.getElementById("location")?.value || "";
    const jobType = document.getElementById("jobType")?.value || "";

    const res = await apiGet(
      `/jobs?keyword=${keyword}&location=${location}&type=${jobType}&page=${page}`
    );

    const jobs = res.jobs || res;

    if (reset) container.innerHTML = "";

    if (!jobs.length && page === 1) {
      container.innerHTML = "<p>No jobs found</p>";
      return;
    }

    jobs.forEach(renderJob);

    document.getElementById("pageInfo").innerText = `Page ${page}`;

  } catch (err) {
    console.error(err);
    if (reset) container.innerHTML = "<p>Error loading jobs</p>";
  }

  loading = false;
}

function renderJob(job) {

  if (renderedJobIds.has(job._id)) return;
  renderedJobIds.add(job._id);

  const div = document.createElement("div");
  div.className = "job-card";

  div.innerHTML = `
    <div class="job-top">

      <div class="job-info">
        <h3 class="job-title">
          ${job.title}
        </h3>

        <p class="job-company">
          ${job.company || "Unknown Company"}
        </p>
      </div>

      <span class="job-type">
        ${job.type || "Full-time"}
      </span>

    </div>

    <div class="job-meta">
      <span>📍 ${job.location || "Remote"}</span>
      <span>
        💰 ₹${job.salary?.min || 0}
        - ₹${job.salary?.max || 0}
      </span>
    </div>

    <p class="job-description">
      ${
        job.description
          ? job.description.substring(0, 120) + "..."
          : "No description available"
      }
    </p>

    <div class="job-actions">

      <button class="view-btn">
        View Details
      </button>

      <button
        class="apply-btn"
        data-job-id="${job._id}">
        Apply
      </button>

    </div>
  `;

  const viewBtn =
    div.querySelector(".view-btn");

  const applyBtn =
    div.querySelector(".apply-btn");

  // Applied state
  if (appliedJobs.has(job._id)) {
    applyBtn.innerText = "Applied ✓";
    applyBtn.disabled = true;
  }

  // View Details
  viewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openJobModal(job);
  });

  // Apply
  applyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    applyJob(job._id, applyBtn);
  });

  document
    .getElementById("jobsList")
    .appendChild(div);
}

async function applyJob(id, btn) {

  if (appliedJobs.has(id)) {
    btn.innerText = "Applied ✓";
    btn.disabled = true;
    return;
  }

  btn.innerText = "Applying...";
  btn.disabled = true;

  try {

    await apiPost(`/applications/apply/${id}`, {});

    appliedJobs.add(id);

    document
      .querySelectorAll(`[data-job-id="${id}"]`)
      .forEach(button => {
        button.innerText = "Applied ✓";
        button.disabled = true;
      });

    const modalBtn =
      document.getElementById("modalApplyBtn");

    if (modalBtn) {
      modalBtn.innerText = "Applied ✓";
      modalBtn.disabled = true;
    }

    alert("Application submitted successfully");

  } catch (err) {

    console.error(err);

    btn.innerText = "Apply";
    btn.disabled = false;

    alert(
      err?.message ||
      "Failed to apply for job"
    );
  }
}


function openJobModal(job) {
  document.getElementById("modalTitle").innerText = job.title;
  document.getElementById("modalCompany").innerText = job.company || "";
  document.getElementById("modalLocation").innerText = job.location || "";
  document.getElementById("modalSalary").innerText =
  `₹${job.salary?.min || 0} - ₹${job.salary?.max || 0}`;

  document.getElementById("modalExperience").innerText =job.experience || "Not specified";

  const skills = document.getElementById("modalSkills");
  skills.innerHTML = "";

  if (job.skills?.length) {
    job.skills.forEach(s => {
      const span = document.createElement("span");
      span.className = "skill";
      span.innerText = s;
      skills.appendChild(span);
    });
  } else {
    skills.innerHTML = "<small>No skills listed</small>";
  }

  document.getElementById("modalDescription").innerText =
    job.description || "";

  const btn = document.getElementById("modalApplyBtn");

  if (appliedJobs.has(job._id)) {
    btn.innerText = "Applied ✓";
    btn.disabled = true;
  } else {
    btn.innerText = "Apply";
    btn.disabled = false;
    btn.onclick = () => applyJob(job._id, btn);
  }

  document.getElementById("jobModal").classList.remove("hidden");
}


function setupEventListeners() {

  document.getElementById("searchBtn")
    ?.addEventListener("click", () => loadJobs(true));

  document.getElementById("nextPage")
    ?.addEventListener("click", () => {
      page++;
      loadJobs(true);
    });

  document.getElementById("prevPage")
    ?.addEventListener("click", () => {

      if (page > 1) {
        page--;
        loadJobs(true);
      }

    });

  document.getElementById("logoutBtn")
    ?.addEventListener("click", logout);

  document.getElementById("closeModalBtn")
    ?.addEventListener("click", closeJobModal);

  document.getElementById("jobModal")
    ?.addEventListener("click", (e) => {

      if (e.target.id === "jobModal") {
        closeJobModal();
      }

    });

}

function closeJobModal() {

  document
    .getElementById("jobModal")
    .classList.add("hidden");

}

const modal =document.getElementById("jobModal");

modal?.addEventListener("click", (e) => {

  if (e.target === modal) {
    closeJobModal();
  }

});



async function loadRecommendedJobs() {
  try {
    const jobs = await apiGet("/jobs/recommended");
    const container = document.getElementById("recommendedJobs");

    if (!container) return;

    container.innerHTML = "";

    jobs.forEach(job => {
      const div = document.createElement("div");
      div.className = "job-card";

      div.innerHTML = `
  <h4>${job.title}</h4>
  <p>${job.company || ""}</p>

  <button
    class="apply-btn"
    data-job-id="${job._id}">
    Apply
  </button>
`;

      const btn = div.querySelector("button");

      if (appliedJobs.has(job._id)) {
        btn.innerText = "Applied ✓";
        btn.disabled = true;
      }

      btn.addEventListener("click", () =>
        applyJob(job._id, btn)
      );

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
  }
}


function logout() {
  localStorage.removeItem("accessToken");
  sessionStorage.clear();
  window.location = "/auth/login.html";
}