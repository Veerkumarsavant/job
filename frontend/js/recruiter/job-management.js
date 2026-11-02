let editingJobId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadJobs();

  document
    .getElementById("createJobBtn")
    .addEventListener("click", createJob);

  document
    .getElementById("saveEditBtn")
    .addEventListener("click", saveEdit);

  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeModal);

  document
    .getElementById("searchInput")
    ?.addEventListener("input", filterJobs);
});

async function createJob() {

  const title = document.getElementById("title").value.trim();
  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!title || !location || !description) return;

  await api("/jobs", "POST", {
    title,
    location,
    description,
    status: "open"
  });

  clearForm();
  loadJobs();
}


let allJobs = [];

async function loadJobs() {

  const container = document.getElementById("jobList");
  container.innerHTML = `<div class="loader"></div>`;

  const jobs = await api("/jobs/my");
  allJobs = jobs;

  renderJobs(jobs);
}

function renderJobs(jobs) {

  const container = document.getElementById("jobList");
  container.innerHTML = "";

  if (!jobs.length) {
    container.innerHTML = "<p>No jobs found</p>";
    return;
  }

  jobs.forEach(job => {
    container.appendChild(createJobCard(job));
  });
}



function createJobCard(job) {

  const div = document.createElement("div");
  div.className = "job-card";

  div.innerHTML = `
    <h4>${job.title}</h4>
    <p>${job.location}</p>
    <small>Status: 
      <span class="status-badge ${job.status}">
        ${job.status}
      </span>
    </small>
    <div class="job-actions">
      <button class="btn-secondary editBtn">Edit</button>
      <button class="btn-primary toggleBtn">
        ${job.status === "open" ? "Close" : "Reopen"}
      </button>
      <button class="btn-danger deleteBtn">Delete</button>
    </div>
  `;

  div.querySelector(".editBtn")
    .addEventListener("click", () => openEdit(job));

  div.querySelector(".toggleBtn")
    .addEventListener("click", () => toggleStatus(job));

  div.querySelector(".deleteBtn")
    .addEventListener("click", () => softDelete(job._id, div));

  return div;
}

function openEdit(job) {
  editingJobId = job._id;

  document.getElementById("editTitle").value = job.title;
  document.getElementById("editLocation").value = job.location;
  document.getElementById("editDescription").value = job.description;

  document.getElementById("editModal")
    .classList.remove("hidden");
}

function closeModal() {
  document.getElementById("editModal")
    .classList.add("hidden");
}

async function saveEdit() {

  const title = document.getElementById("editTitle").value;
  const location = document.getElementById("editLocation").value;
  const description = document.getElementById("editDescription").value;

  await api(`/jobs/${editingJobId}`, "PUT", {
    title,
    location,
    description
  });

  closeModal();
  loadJobs();
}


async function toggleStatus(job) {

  const newStatus = job.status === "open"
    ? "closed"
    : "open";

  await api(`/jobs/${job._id}`, "PUT", {
    status: newStatus
  });

  loadJobs();
}


async function softDelete(id, element) {

  if (!confirm("Delete this job?")) return;

  await api(`/jobs/${id}`, "DELETE");

  element.style.opacity = "0.4";

  const undo = document.createElement("button");
  undo.innerText = "Undo";
  undo.className = "btn-secondary";
  element.appendChild(undo);

  undo.addEventListener("click", async () => {
    await api(`/jobs/${id}/restore`, "POST");
    loadJobs();
  });
}


function filterJobs(e) {

  const value = e.target.value.toLowerCase();

  const filtered = allJobs.filter(job =>
    job.title.toLowerCase().includes(value) ||
    job.location.toLowerCase().includes(value)
  );

  renderJobs(filtered);
}


function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("location").value = "";
  document.getElementById("description").value = "";
}



const API = "http://localhost:5000/api";
const token = localStorage.getItem("token");
const jobList = document.getElementById("jobList");
const jobCount = document.getElementById("jobCount");
const emptyState = document.getElementById("emptyState");


async function loadJobs(){

 const res = await fetch(`${API}/jobs/my`,{
  headers:{
   Authorization:`Bearer ${token}`
  }
 });

 const jobs = await res.json();

 jobList.innerHTML="";

 jobCount.innerText = `${jobs.length} jobs`;

 if(jobs.length === 0){
  emptyState.classList.remove("hidden");
  return;
 }

 emptyState.classList.add("hidden");

 jobs.forEach(job=>{
  renderJob(job);
 });

}

loadJobs();



function renderJob(job){

 const card = document.createElement("div");

 card.className="job-card";

 card.innerHTML = `
  <h4>${job.title}</h4>
  <p>${job.location}</p>
  <p>${job.description}</p>

  <div class="job-actions">
   <button onclick="openEdit('${job._id}')">Edit</button>
   <button onclick="deleteJob('${job._id}')">Delete</button>
  </div>
 `;

 jobList.appendChild(card);

}


document
.getElementById("createJobForm")
.addEventListener("submit",async(e)=>{

 e.preventDefault();

 const job = {
  title:title.value,
  location:location.value,
  description:description.value
 };

 await fetch(`${API}/jobs`,{
  method:"POST",
  headers:{
   "Content-Type":"application/json",
   Authorization:`Bearer ${token}`
  },
  body:JSON.stringify(job)
 });

 e.target.reset();

 loadJobs();

});


async function deleteJob(id){

 await fetch(`${API}/jobs/${id}`,{
  method:"DELETE",
  headers:{
   Authorization:`Bearer ${token}`
  }
 });

 loadJobs();

}