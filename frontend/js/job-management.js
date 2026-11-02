let allJobs = [];
let editingJobId = null;
let editFields = {};

function setupJobSocket() {
  if (!window.socket || socket._jobsBound) return;
  socket._jobsBound = true;

  socket.on("jobCreated", (job) => {
    if (document.querySelector(`[data-id="${job._id}"]`)) return;

    const container = document.getElementById("jobList");
    if (!container) return;

    // match temp job safely
    const tempEl = [...document.querySelectorAll('[data-id^="temp-"]')]
      .find(el =>
        el.querySelector("h4")?.textContent === job.title &&
        el.innerText.includes(job.company || "") &&
        el.innerText.includes(job.location || "")
      );

    if (tempEl) {
      tempEl.replaceWith(createJobCard(job));

      allJobs = allJobs.map(j =>
        String(j._id).startsWith("temp-") ? job : j
      );
    } else {
      if (!allJobs.some(j => j._id === job._id)) {
        allJobs.unshift(job);
        container.prepend(createJobCard(job));
      }
    }

    updateCount();
  });

  socket.on("jobUpdated", (job) => {
    const el = document.querySelector(`[data-id="${job._id}"]`);
    if (el) el.replaceWith(createJobCard(job));

    allJobs = allJobs.map(j =>
      j._id === job._id ? job : j
    );
  });

  socket.on("jobDeleted", (id) => {
    document.querySelector(`[data-id="${id}"]`)?.remove();

    allJobs = allJobs.filter(j => j._id !== id);
    updateCount();
  });

  socket.on("connect", () => {
    if (!allJobs.length) {
      console.log("🔄 Sync after reconnect");
      loadJobs();
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  setupJobSocket();

  editFields = {
    title: document.getElementById("editTitle"),
    company: document.getElementById("editCompany"),
    location: document.getElementById("editLocation"),
    role: document.getElementById("editRole"),
    description: document.getElementById("editDescription"),
    skills: document.getElementById("editSkills"),
    salaryMin: document.getElementById("editSalaryMin"),
    salaryMax: document.getElementById("editSalaryMax"),
    experience: document.getElementById("editExperience")
  };

  loadJobs();

  document.getElementById("createJobForm")
    ?.addEventListener("submit", createJob);

  document.getElementById("saveEditBtn")
    ?.addEventListener("click", saveEdit);

  document.getElementById("closeModalBtn")
    ?.addEventListener("click", closeModal);

  document.getElementById("searchInput")
    ?.addEventListener("input", applyFilters);

  document.getElementById("skillFilter")
    ?.addEventListener("input", applyFilters);

  document.getElementById("minSalaryFilter")
    ?.addEventListener("input", applyFilters);

  document.getElementById("maxSalaryFilter")
    ?.addEventListener("input", applyFilters);

  document.getElementById("sortSelect")
    ?.addEventListener("change", applyFilters);

  document.getElementById("clearFiltersBtn")
    ?.addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("skillFilter").value = "";
      document.getElementById("minSalaryFilter").value = "";
      document.getElementById("maxSalaryFilter").value = "";
      document.getElementById("sortSelect").value = "";

      applyFilters();
    });
});


async function loadJobs() {
  const container = document.getElementById("jobList");
  if (!container) return;

  container.innerHTML = "<p>Loading...</p>";

  try {
    const data = await api("/jobs/my");
    const jobs = data.jobs || data;

    allJobs = jobs;

    updateCount();
    renderJobs(jobs);

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading jobs</p>";
  }
}


function renderJobs(jobs) {
  const container = document.getElementById("jobList");
  if (!container) return;

  container.innerHTML = "";

  if (!jobs.length) {
    document.getElementById("emptyState")?.classList.remove("hidden");
    return;
  }

  document.getElementById("emptyState")?.classList.add("hidden");

  jobs.forEach(job => {
    container.appendChild(createJobCard(job));
  });
}

function createJobCard(job) {

  const div = document.createElement("div");

  div.className = "job-card";

  div.dataset.id = job._id;

  div.innerHTML = `
    <h4>${job.title}</h4>

    <p>
      <strong>Company:</strong>
      ${job.company || "-"}
    </p>

    <p>
      <strong>Location:</strong>
      ${job.location || "-"}
    </p>

    <p>
      <strong>Role:</strong>
      ${job.role || "-"}
    </p>

    <p>
      <strong>Skills:</strong>
      ${(job.skills || []).join(", ")}
    </p>

    <p>
      <strong>Salary:</strong>
      ₹${job.salary?.min || 0}
      -
      ₹${job.salary?.max || 0}
    </p>

    <p>
      <strong>Experience:</strong>
      ${job.experience || "0-2"} Years
    </p>

    <p>
      <strong>Status:</strong>
      ${job.status || "active"}
    </p>

    <p>
      <strong>Applicants:</strong>
      ${job.applications?.length || 0}
    </p>

    <p>${job.description || ""}</p>

    <div class="job-actions">

      <button class="editBtn">
        Edit
      </button>

      <button class="deleteBtn">
        Delete
      </button>

      <button class="viewApplicantsBtn">
        Applicants
      </button>

    </div>
  `;

  div.querySelector(".editBtn")
    .onclick = () => openEdit(job);

  div.querySelector(".deleteBtn")
    .onclick = () => deleteJob(job._id);

  div.querySelector(".viewApplicantsBtn")
    .onclick = () =>
      viewApplicants(job._id);

  return div;
}

function updateCount() {
  const el = document.getElementById("jobCount");
  if (el) el.innerText = `${allJobs.length} jobs`;
}


async function createJob(e) {
  e.preventDefault();

  try {

    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: title.value,
        company: company.value,
        location: location.value,
        role: role.value,
        description: description.value,
        skills: skills.value,
        salaryMin: salaryMin.value,
        salaryMax: salaryMax.value,
        experience: experience.value,
        type:document.getElementById("jobType")?.value ||"fulltime"
      })
    });
    await loadJobs();
    e.target.reset();

    alert("Job created successfully");

  } catch (err) {

    console.error(err);

    alert("Failed to create job");
  }
}


function openEdit(job) {
  editingJobId = job._id;

  editFields.title.value =
    job.title || "";

  editFields.company.value =
    job.company || "";

  editFields.location.value =
    job.location || "";

  editFields.role.value =
    job.role || "";

  editFields.description.value =
    job.description || "";

  editFields.skills.value =
    (job.skills || []).join(", ");

  editFields.salaryMin.value =
    job.salary?.min || "";

  editFields.salaryMax.value =
    job.salary?.max || "";

  editFields.experience.value =
    job.experience || "";

  document
    .getElementById("editModal")
    ?.classList.remove("hidden");
}


function closeModal() {
  document.getElementById("editModal")?.classList.add("hidden");
}

async function saveEdit() {

  const updated = {
    title: editFields.title.value,
    company: editFields.company.value,
    location: editFields.location.value,
    role: editFields.role.value,
    description: editFields.description.value,
    skills: editFields.skills.value,
    salaryMin: editFields.salaryMin.value,
    salaryMax: editFields.salaryMax.value,
    experience: editFields.experience.value
  };

  try {

    const savedJob = await api(
      `/jobs/${editingJobId}`,
      {
        method: "PUT",
        body: JSON.stringify(updated)
      }
    );

    allJobs = allJobs.map(job =>
      job._id === editingJobId
        ? savedJob
        : job
    );

    renderJobs(allJobs);

    closeModal();

  } catch (err) {

    console.error(err);

    alert("Failed to update job");
  }
}


async function deleteJob(id) {
  if (!confirm("Delete job?")) return;

  const el = document.querySelector(`[data-id="${id}"]`);
  const backup = [...allJobs];

  el?.remove();
  allJobs = allJobs.filter(j => j._id !== id);
  updateCount();

  try {
    await api(`/jobs/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error(err);

    // rollback
    allJobs = backup;
    const job = backup.find(j => j._id === id);
    document.getElementById("jobList")
      ?.prepend(createJobCard(job));
    updateCount();
  }
}


function applyFilters() {

  const search =document.getElementById("searchInput")?.value.toLowerCase() || "";

  const skill =document.getElementById("skillFilter")?.value.toLowerCase() || "";

  const minSalary =
    Number(
      document.getElementById("minSalaryFilter")?.value
    ) || 0;

  const maxSalary =
    Number(
      document.getElementById("maxSalaryFilter")?.value
    ) || Infinity;

  const sort =document.getElementById("sortSelect")?.value || "";

  let filtered = allJobs.filter(job =>

    (job.title || "").toLowerCase().includes(search) ||

    (job.company || "").toLowerCase().includes(search) ||

    (job.role || "").toLowerCase().includes(search) ||

    (job.location || "").toLowerCase().includes(search) ||

    (job.description || "").toLowerCase().includes(search) ||

    (job.skills || [])
      .join(" ")
      .toLowerCase()
      .includes(search)
  );

  if (skill) {
    filtered = filtered.filter(job =>
      (job.skills || [])
        .join(" ")
        .toLowerCase()
        .includes(skill)
    );
  }

  filtered = filtered.filter(job =>
    (job.salary?.min || 0) >= minSalary &&
    (job.salary?.max || 0) <= maxSalary
  );

  if (sort === "salaryLow") {
    filtered.sort(
      (a, b) =>
        (a.salary?.min || 0) -
        (b.salary?.min || 0)
    );
  }

  if (sort === "salaryHigh") {
    filtered.sort(
      (a, b) =>
        (b.salary?.max || 0) -
        (a.salary?.max || 0)
    );
  }

  if (sort === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );
  }

  renderJobs(filtered);
}

async function viewApplicants(jobId) {
  try {

    const applicants = await api(
      `/jobs/applicants/${jobId}`
    );

    const html = applicants.map(app => `
      <div class="applicant-card">

        <h4>${app.user?.name || "Unknown"}</h4>

        <p>${app.user?.email || ""}</p>

        <p>
          Current Status:
          <strong>${app.status}</strong>
        </p>

        <select
          onchange="updateApplicantStatus(
            '${jobId}',
            '${app.user._id}',
            this.value
          )">

          <option value="applied"
            ${app.status === "applied" ? "selected" : ""}>
            Applied
          </option>

          <option value="reviewing"
            ${app.status === "reviewing" ? "selected" : ""}>
            Reviewing
          </option>

          <option value="shortlisted"
            ${app.status === "shortlisted" ? "selected" : ""}>
            Shortlisted
          </option>

          <option value="rejected"
            ${app.status === "rejected" ? "selected" : ""}>
            Rejected
          </option>

          <option value="hired"
            ${app.status === "hired" ? "selected" : ""}>
            Hired
          </option>

        </select>

      </div>
    `).join("");

    document.getElementById(
      "applicantsContainer"
    ).innerHTML = html;

    document.getElementById(
      "applicantsModal"
    ).classList.remove("hidden");

  } catch (err) {

    console.error(err);

    alert("Failed to load applicants");
  }
}

async function updateApplicantStatus(
  jobId,
  userId,
  status
) {
  try {

    await api(
      `/jobs/${jobId}/applicants/${userId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status })
      }
    );

    alert("Status updated");

await viewApplicants(jobId);
await loadJobs();

  } catch (err) {

    console.error(err);

    alert("Failed to update status");
  }
}

function closeApplicantsModal() {
  document
    .getElementById("applicantsModal")
    ?.classList.add("hidden");
}