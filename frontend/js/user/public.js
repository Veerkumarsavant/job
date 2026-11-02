document.addEventListener("DOMContentLoaded", () => {
  loadPublicResume();
  loadComments();

  document
    .getElementById("submitComment")
    .addEventListener("click", submitComment);
});

const resumeId = new URLSearchParams(window.location.search)
  .get("id");

/* ===============================
   LOAD RESUME
================================ */

async function loadPublicResume() {

  const resume = await fetch(`/api/public/${resumeId}`)
    .then(res => res.json());

  document.getElementById("name").innerText =
    resume.name || "";

  document.getElementById("title").innerText =
    resume.title || "";

  document.getElementById("summary").innerText =
    resume.summary || "";

  document.getElementById("skills").innerHTML =
    resume.skills?.split(",")
      .map(skill => `<li>${skill.trim()}</li>`)
      .join("") || "";

  document.getElementById("profileImage").src =
    resume.profileImage || "https://via.placeholder.com/120";
}

/* ===============================
   LOAD COMMENTS
================================ */

async function loadComments() {

  const comments = await fetch(
    `/api/public/${resumeId}/comments`
  ).then(res => res.json());

  const list = document.getElementById("commentList");

  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <strong>${c.name}</strong>
      <p>${c.text}</p>
    </div>
  `).join("");
}

/* ===============================
   SUBMIT COMMENT
================================ */

async function submitComment() {

  const name = document
    .getElementById("commentName").value;

  const text = document
    .getElementById("commentText").value;

  if (!name || !text) return;

  await fetch(
    `/api/public/${resumeId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text })
    }
  );

  document.getElementById("commentName").value = "";
  document.getElementById("commentText").value = "";

  loadComments();
}