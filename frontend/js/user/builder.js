const RESUME_API ="http://localhost:5000/api/resume";
const nameInput =document.getElementById("nameInput");
const titleInput =document.getElementById("titleInput");
const emailInput =document.getElementById("emailInput");
const phoneInput =document.getElementById("phoneInput");
const locationInput =document.getElementById("locationInput");
const linkedinInput =document.getElementById("linkedinInput");
const githubInput = document.getElementById("githubInput");
const summaryInput =document.getElementById("summaryInput");
const skillsInput =document.getElementById("skillsInput");
const preview = document.getElementById("resumepreview");
const templateSelect =document.getElementById("templateSelect");
const scoreBar = document.getElementById("scoreBar");
const scorePercent = document.getElementById("scorePercent");
const autoSaveStatus = document.getElementById("autoSaveStatus");
const rewriteBtn =document.getElementById("rewriteBtn");
const downloadBtn =document.getElementById("downloadBtn");
const shareBtn =document.getElementById("shareBtn");
const uploadBtn =document.getElementById("uploadBtn");
const versionTimeline =document.getElementById("versionTimeline");
const addExperienceBtn =document.getElementById("addExperienceBtn");
const addEducationBtn = document.getElementById("addEducationBtn" );
const addProjectBtn =document.getElementById("addProjectBtn");
const addCertificationBtn =document.getElementById("addCertificationBtn" );
const experienceContainer =document.getElementById("experienceContainer");
const educationContainer =document.getElementById("educationContainer");
const projectsContainer =document.getElementById( "projectsContainer");
const certificationContainer =document.getElementById( "certificationContainer");

let saveTimeout;
let serverSaveTimeout;
let versionTimeout;

let resumeData = {
  _id: null,
  template: "modern",
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  summary: "",
  skills: "",
  experience: [],
  education: [],
  projects: [],
  certifications: []
};

init();

async function init() {

  loadResume();

  syncInputs();

  renderAllSections();

  renderPreview();

  updateScore();

  renderVersions();

  attachEvents();

  await loadResumeFromURL();

}

function attachEvents() {

  [
    nameInput,
    titleInput,
    emailInput,
    phoneInput,
    locationInput,
    linkedinInput,
    githubInput,
    summaryInput,
    skillsInput
  ].forEach(input => {

    if (!input) return;

    input.addEventListener(
      "input",
      handleInput
    );

  });

  templateSelect?.addEventListener(
    "change",
    () => {

      resumeData.template =
        templateSelect.value;

      renderPreview();

      autoSave();

    }
  );

  rewriteBtn?.addEventListener(
    "click",
    rewriteSummary
  );

  downloadBtn?.addEventListener(
    "click",
    downloadResume
  );

  shareBtn?.addEventListener(
    "click",
    shareResume
  );

  uploadBtn?.addEventListener(
    "click",
    uploadResume
  );

  addExperienceBtn?.addEventListener(
    "click",
    addExperience
  );

  addEducationBtn?.addEventListener(
    "click",
    addEducation
  );

  addProjectBtn?.addEventListener(
    "click",
    addProject
  );

  addCertificationBtn?.addEventListener(
    "click",
    addCertification
  );

}

function handleInput() {
  clearTimeout(saveTimeout);
  saveTimeout =setTimeout(() => {
      resumeData.name = nameInput.value.trim();
      resumeData.title =titleInput.value.trim();
      resumeData.email = emailInput.value.trim();
      resumeData.phone = phoneInput.value.trim();
      resumeData.location = locationInput.value.trim();
      resumeData.linkedin = linkedinInput.value.trim();
      resumeData.github = githubInput.value.trim();
      resumeData.summary = summaryInput.value.trim();
      resumeData.skills = skillsInput.value.trim();
      renderPreview();
      updateScore();
      autoSave();
    }, 300);

}

function escapeHTML(
  text = ""
) {

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function syncInputs() {

  if (nameInput)
    nameInput.value =
      resumeData.name || "";

  if (titleInput)
    titleInput.value =
      resumeData.title || "";

  if (emailInput)
    emailInput.value =
      resumeData.email || "";

  if (phoneInput)
    phoneInput.value =
      resumeData.phone || "";

  if (locationInput)
    locationInput.value =
      resumeData.location || "";

  if (linkedinInput)
    linkedinInput.value =
      resumeData.linkedin || "";

  if (githubInput)
    githubInput.value =
      resumeData.github || "";

  if (summaryInput)
    summaryInput.value =
      resumeData.summary || "";

  if (skillsInput)
    skillsInput.value =
      resumeData.skills || "";

  if (templateSelect)
    templateSelect.value =
      resumeData.template || "modern";

}

function renderPreview() {

  if (!preview) return;

  preview.className =
    `resume-preview ${
      resumeData.template || "modern"
    }`;

  const createEmptyState = (
    text
  ) => `
    <p class="empty-state">
      ${text}
    </p>
  `;

  const createCard = (
    title,
    subtitle = "",
    extra = ""
  ) => `
    <div class="preview-card">

      ${
        extra
          ? `
          <div class="preview-card-header">

            <h4>${title}</h4>

            <span>${extra}</span>

          </div>
          `
          : `
          <h4>${title}</h4>
          `
      }

      ${
        subtitle
          ? `
          <p class="preview-subtitle">
            ${subtitle}
          </p>
          `
          : ""
      }

    </div>
  `;

  const skillsHTML =
    (resumeData.skills || "")
    .split(",")
    .filter(skill =>
      skill.trim()
    )
    .map(skill => `
      <span class="skill-tag">
        ${escapeHTML(skill.trim())}
      </span>
    `)
    .join("");

  const experienceHTML =
    (resumeData.experience || [])
    .map(item =>
      createCard(
        escapeHTML(item.role || ""),
        escapeHTML(item.company || ""),
        escapeHTML(item.duration || "")
      )
    )
    .join("");

  const educationHTML =
    (resumeData.education || [])
    .map(item =>
      createCard(
        escapeHTML(item.degree || ""),
        escapeHTML(item.college || "")
      )
    )
    .join("");

  const projectsHTML =
    (resumeData.projects || [])
    .map(item => `
      <div class="preview-card">

        <h4>
          ${escapeHTML(item.name || "")}
        </h4>

        <p>
          ${escapeHTML(item.description || "")}
        </p>

      </div>
    `)
    .join("");

  const certificationsHTML =
    (resumeData.certifications || [])
    .map(item =>
      createCard(
        escapeHTML(item.name || ""),
        escapeHTML(item.organization || "")
      )
    )
    .join("");

  preview.innerHTML = `

    <div class="resume-header">

      <h1>
        ${
          escapeHTML(
            resumeData.name
          ) || "Your Name"
        }
      </h1>

      <h2>
        ${
          escapeHTML(
            resumeData.title
          ) ||
          "Professional Title"
        }
      </h2>

      <div class="resume-contact">

        ${
          resumeData.email
            ? `
            <span>
              ${escapeHTML(resumeData.email)}
            </span>
            `
            : ""
        }

        ${
          resumeData.phone
            ? `
            <span>
              ${escapeHTML(resumeData.phone)}
            </span>
            `
            : ""
        }

        ${
          resumeData.location
            ? `
            <span>
              ${escapeHTML(resumeData.location)}
            </span>
            `
            : ""
        }

      </div>

      <div class="resume-links">

        ${
          resumeData.linkedin
            ? `
            <a
              href="${escapeHTML(resumeData.linkedin)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            `
            : ""
        }

        ${
          resumeData.github
            ? `
            <a
              href="${escapeHTML(resumeData.github)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            `
            : ""
        }

      </div>

    </div>

    <div class="resume-section">

      <h3>
        Professional Summary
      </h3>

      <p>
        ${
          escapeHTML(
            resumeData.summary
          ) ||
          "Add your professional summary"
        }
      </p>

    </div>

    <div class="resume-section">

      <h3>
        Skills
      </h3>

      <div class="skills-list">

        ${
          skillsHTML ||
          createEmptyState(
            "Add your skills"
          )
        }

      </div>

    </div>

    <div class="resume-section">

      <h3>
        Experience
      </h3>

      ${
        experienceHTML ||
        createEmptyState(
          "Add work experience"
        )
      }

    </div>

    <div class="resume-section">

      <h3>
        Education
      </h3>

      ${
        educationHTML ||
        createEmptyState(
          "Add education details"
        )
      }

    </div>

    <div class="resume-section">

      <h3>
        Projects
      </h3>

      ${
        projectsHTML ||
        createEmptyState(
          "Add your projects"
        )
      }

    </div>

    <div class="resume-section">

      <h3>
        Certifications
      </h3>

      ${
        certificationsHTML ||
        createEmptyState(
          "Add certifications"
        )
      }

    </div>

  `;

}

function updateScore() {
  let score = 0;
  const skills =(resumeData.skills || "").toLowerCase();
  const summary = (resumeData.summary || "").toLowerCase();
  const atsKeywords = [
    "javascript",
    "react",
    "node",
    "mongodb",
    "express",
    "api",
    "frontend",
    "backend",
    "html",
    "css",
    "sql",
    "aws",
    "docker",
    "git"

  ];

  if (resumeData.name)
    score += 10;

  if (resumeData.title)
    score += 10;

  if (resumeData.email)
    score += 5;

  if (resumeData.phone)
    score += 5;
  if (
  !(resumeData.summary || "")
) {
  score -= 5;
}

  if (
  (resumeData.summary || "")
  .length > 80
)
  score += 15;

  const matchedKeywords =
    atsKeywords.filter(keyword =>
      skills.includes(keyword) ||
      summary.includes(keyword)
    );
    score += Math.min(
  matchedKeywords.length * 3,
  30
);

if (resumeData.experience.length)
  score += 20;

if (resumeData.education.length)
  score += 10;

if (resumeData.projects.length)
  score += 10;

score = Math.max(
  0,
  Math.min(score, 100)
);

if (scoreBar) {
  scoreBar.style.width = `${score}%`;
}

if (scorePercent) {
  scorePercent.textContent = `${score}%`;
}
  
}

function autoSave() {

  showStatus(
    "Saving..."
  );

  localStorage.setItem(
    "resumeData",
    JSON.stringify(resumeData)
  );

  clearTimeout(
    versionTimeout
  );

  versionTimeout =
    setTimeout(
      saveVersion,
      3000
    );

  clearTimeout(
    serverSaveTimeout
  );

  serverSaveTimeout =
    setTimeout(() => {

      saveResumeToServer();

    }, 1000);

}

function showStatus(
  message
) {

  if (!autoSaveStatus)
    return;

  autoSaveStatus.textContent =
    message;

}

async function saveResumeToServer() {
  try {
    const token =
      localStorage.getItem("accessToken");

    const payload = {
      ...resumeData,

      skills: (resumeData.skills || "")
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean)
    };

    const endpoint =resumeData._id? `${RESUME_API}/${resumeData._id}`: `${RESUME_API}`;

    const method = resumeData._id? "PUT": "POST";

    const response =
      await fetch(endpoint, {
        method,

        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify(payload)
      });

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        "Save failed"
      );
    }

    if (
      !resumeData._id &&
      result.data
    ) {
      resumeData._id =
        result.data._id;

      localStorage.setItem(
        "resumeData",
        JSON.stringify(
          resumeData
        )
      );
    }

    showStatus("Saved");

  } catch (err) {
    console.error(
      "Server save failed:",
      err
    );
    showStatus("Save failed ⚠");
  }
}

function loadResume() {

  try {

    const savedData =
      localStorage.getItem(
        "resumeData"
      );

    if (!savedData)
      return;

    const parsed =
      JSON.parse(savedData);

    resumeData = {

      _id:
        parsed._id || null,

      template:
        parsed.template || "modern",

      name:
        parsed.name || "",

      title:
        parsed.title || "",

      email:
        parsed.email || "",

      phone:
        parsed.phone || "",

      location:
        parsed.location || "",

      linkedin:
        parsed.linkedin || "",

      github:
        parsed.github || "",

      summary:
        parsed.summary || "",

      skills:
        parsed.skills || "",

      experience:
        Array.isArray(
          parsed.experience
        )
          ? parsed.experience
          : [],

      education:
        Array.isArray(
          parsed.education
        )
          ? parsed.education
          : [],

      projects:
        Array.isArray(
          parsed.projects
        )
          ? parsed.projects
          : [],

      certifications:
        Array.isArray(
          parsed.certifications
        )
          ? parsed.certifications
          : []

    };

  } catch {

    console.error(
      "Failed to load resume"
    );

  }

}

async function loadResumeFromURL() {

  try {

    const path =
      window.location.pathname;

    const resumeId =
      path.split("/")
      .pop();

    if (
      !resumeId ||
      resumeId ===
      "resume-builder.html"
    ) {
      return;
    }

    const response =
      await fetch(
        `${RESUME_API}/${resumeId}`
      );

    if (!response.ok)
      return;

    const data =
      await response.json();

    resumeData = data;

    syncInputs();

    renderAllSections();

    renderPreview();

    updateScore();

  } catch {

    console.error(
      "Failed to load resume"
    );

  }

}

function rewriteSummary() {

  summaryInput.value = `
Experienced ${
    resumeData.title ||
    "professional"
} with strong expertise in ${
    resumeData.skills ||
    "modern technologies"
}. Passionate about building
scalable applications and
delivering impactful solutions.
  `.trim();

  handleInput();

}

function downloadResume() {

  const originalTitle =
    document.title;

  const style =
    document.createElement(
      "style"
    );

  style.innerHTML = `
    @page {
      size: auto;
      margin: 0;
    }

    @media print {

      body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }

      body * {
        visibility: hidden;
      }

      #resumepreview,
      #resumepreview * {
        visibility: visible;
      }

      #resumepreview {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 30px;
        margin: 0;
        background: white !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }

      .preview-card {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }

    }
  `;

  document.head.appendChild(
    style
  );

  document.title =
    `${
      resumeData.name || "Resume"
    }`;

  window.print();

  setTimeout(() => {

    document.title =
      originalTitle;

    style.remove();

  }, 1000);

}

async function shareResume() {
  if (!resumeData._id) {
    alert("Save resume first.");
    return;
  }

  const shareLink =`${window.location.origin}/resume/${resumeData._id}`;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareLink);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value =shareLink;
      document.body.appendChild( textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    alert("Share link copied.");
  } catch (err) {
    console.error("Copy failed:", err);
    prompt("Copy this link manually:",shareLink);

  }

}
function saveVersion() {

  const versions =
    JSON.parse(
      localStorage.getItem(
        "resumeVersions"
      )
    ) || [];

  const currentData =
    JSON.stringify(
      resumeData
    );

  if (
    versions[0] &&
    versions[0].data ===
    currentData
  ) {
    return;
  }

  versions.unshift({

    date:
      new Date()
      .toLocaleString(),

    data:
      currentData

  });

  localStorage.setItem(

    "resumeVersions",

    JSON.stringify(
      versions.slice(0,10)
    )

  );

  renderVersions();

}

function renderVersions() {

  if (!versionTimeline)
    return;

  const versions =
    JSON.parse(
      localStorage.getItem(
        "resumeVersions"
      )
    ) || [];

  if (!versions.length) {

    versionTimeline.innerHTML =
      "<p>No versions yet</p>";

    return;

  }

  versionTimeline.innerHTML =
    versions.map(
      (
        version,
        index
      ) => `
      <div
        class="timeline-item"
        onclick="
          restoreVersion(${index})
        "
      >
        🕒 ${escapeHTML(version.date)}
      </div>
    `
    ).join("");

}

function restoreVersion(
  index
) {

  const versions =
    JSON.parse(
      localStorage.getItem(
        "resumeVersions"
      )
    ) || [];

  if (!versions[index])
    return;

  resumeData =
    JSON.parse(
      versions[index].data
    );

  localStorage.setItem(
    "resumeData",
    JSON.stringify(
      resumeData
    )
  );

  syncInputs();

  renderAllSections();

  renderPreview();

  updateScore();

  showStatus("Version Restored");

}

function addExperience() {
  resumeData.experience.push({
    role: "",
    company: "",
    duration: ""
  });
  renderExperience();
  renderPreview();
  updateScore();
  autoSave();
}

function renderExperience() {

  experienceContainer.innerHTML =
    (resumeData.experience || [])
    .map(
      (
        item,
        index
      ) => `
      <div class="dynamic-group">

        <input
          placeholder="Role"
          value="${escapeHTML(item.role || "")}"
          onchange="
            updateExperience(
              ${index},
              'role',
              this.value
            )
          "
        >

        <input
          placeholder="Company"
          value="${escapeHTML(item.company || "")}"
          onchange="
            updateExperience(
              ${index},
              'company',
              this.value
            )
          "
        >

        <input
          placeholder="Duration"
          value="${escapeHTML(item.duration || "")}"
          onchange="
            updateExperience(
              ${index},
              'duration',
              this.value
            )
          "
        >

        <button
          type="button"
          class="btn-danger"
          onclick="
            removeExperience(${index})
          "
        >
          Remove
        </button>

      </div>
    `
    ).join("");

}

function removeExperience(index) {

  resumeData.experience.splice(
    index,
    1
  );

  renderExperience();

  renderPreview();

  updateScore();

  autoSave();

}

function updateExperience(index,field,value) {
  if (!resumeData.experience[index]) return;
  resumeData.experience[index][field] =value;

  renderPreview();
  updateScore();
  autoSave();

}

function addEducation() {

  resumeData.education.push({
    degree: "",
    college: ""
  });

  renderEducation();
  renderPreview();
  updateScore();
  autoSave();

}

function renderEducation() {

  educationContainer.innerHTML =
    (resumeData.education || [])
    .map(
      (
        item,
        index
      ) => `
      <div class="dynamic-group">

        <input
          placeholder="Degree"
          value="${escapeHTML(item.degree || "")}"
          onchange="
            updateEducationItem(
              ${index},
              'degree',
              this.value
            )
          "
        >

        <input
          placeholder="College"
          value="${escapeHTML(item.college || "")}"
          onchange="
            updateEducationItem(
              ${index},
              'college',
              this.value
            )
          "
        >

        <button
          type="button"
          class="btn-danger"
          onclick="
            removeEducation(${index})
          "
        >
          Remove
        </button>

      </div>
    `
    ).join("");

}

function removeEducation(index) {
  resumeData.education.splice(index,1);
  renderEducation();
  renderPreview();
  updateScore();
  autoSave();
}

function updateEducationItem(index,field,value) {
  if (!resumeData.education[index]) return;
  resumeData.education[index][field] =value;

  renderPreview();
  updateScore();
  autoSave();

}

function addProject() {

  resumeData.projects.push({
    name: "",
    description: ""
  });

  renderProjects();
  renderPreview();
  updateScore();
  autoSave();

}

function renderProjects() {

  projectsContainer.innerHTML =
    (resumeData.projects || [])
    .map(
      (
        item,
        index
      ) => `
      <div class="dynamic-group">

        <input
          placeholder="Project Name"
          value="${escapeHTML(item.name || "")}"
          onchange="
            updateProject(
              ${index},
              'name',
              this.value
            )
          "
        >

        <textarea
          placeholder="Description"
          onchange="
            updateProject(
              ${index},
              'description',
              this.value
            )
          "
        >${escapeHTML(item.description || "")}</textarea>

        <button
          type="button"
          class="btn-danger"
          onclick="
            removeProject(${index})
          "
        >
          Remove
        </button>

      </div>
    `
    ).join("");

}


function removeProject(index) {

  resumeData.projects.splice(
    index,
    1
  );

  renderProjects();

  renderPreview();

  updateScore();

  autoSave();

}

function updateProject( index,field,value) {
  if (!resumeData.projects[index]) return;
  resumeData.projects[index][field] =value;
  renderPreview();
  updateScore();
  autoSave();

}

function addCertification() {
  resumeData.certifications.push({
    name: "",
    organization: ""
  });
  renderCertifications();
  renderPreview();
  updateScore();
  autoSave();
}

function renderCertifications() {

  certificationContainer.innerHTML =
    (resumeData.certifications || [])
    .map(
      (
        item,
        index
      ) => `
      <div class="dynamic-group">

        <input
          placeholder="Certificate Name"
          value="${escapeHTML(item.name || "")}"
          onchange="
            updateCertification(
              ${index},
              'name',
              this.value
            )
          "
        >

        <input
          placeholder="Organization"
          value="${escapeHTML(item.organization || "")}"
          onchange="
            updateCertification(
              ${index},
              'organization',
              this.value
            )
          "
        >

        <button
          type="button"
          class="btn-danger"
          onclick="
            removeCertification(${index})
          "
        >
          Remove
        </button>

      </div>
    `
    ).join("");

}

function removeCertification(index) {

  resumeData.certifications.splice(
    index,
    1
  );

  renderCertifications();

  renderPreview();

  updateScore();

  autoSave();

}

function updateCertification(index,field,value) {
  if (!resumeData.certifications[index]) return;
  resumeData.certifications[index][field] =value;
  renderPreview();
  updateScore();
  autoSave();

}

function renderAllSections() {

  renderExperience();

  renderEducation();

  renderProjects();

  renderCertifications();

}

async function uploadResume() {

  const fileInput =
    document.getElementById(
      "resumeFile"
    );

  if (!fileInput) {
  alert("Resume file input not found");
  return;
}

const file = fileInput.files?.[0];

  if (!file) {

    alert(
      "Select a resume first."
    );

    return;

  }

  try {

    uploadBtn.disabled = true;

    uploadBtn.textContent =
      "Analyzing Resume...";

    let extractedText = "";

    /* PDF */

    if (
      file.type === "application/pdf"
    ) {

      const arrayBuffer =
        await file.arrayBuffer();

      const pdf =
        await pdfjsLib.getDocument({
          data: arrayBuffer
        }).promise;

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {

        const page =
          await pdf.getPage(i);

        const textContent =
          await page.getTextContent();

        let lastY = null;

textContent.items.forEach(item => {

  if (
    lastY !== null &&
    Math.abs(
      item.transform[5] - lastY
    ) > 5
  ) {

    extractedText += "\n";

  }

  extractedText +=
    item.str + " ";

  lastY =
    item.transform[5];

});

extractedText += "\n\n";

      }

    }

    /* DOC/DOCX/TXT */

    else {

      extractedText =
        await file.text();

    }

    extractedText =
  extractedText
    .replace(/\t/g, " ")
    .replace(/\r/g, "\n");

    parseResumeData(
      extractedText
    );

    syncInputs();

    renderAllSections();

    renderPreview();

    updateScore();

    autoSave();

    alert(
      "Resume analyzed successfully."
    );

  } catch (err) {

    console.error(err);

    alert(
      "Resume parsing failed."
    );

  } finally {

    uploadBtn.disabled =
      false;

    uploadBtn.textContent =
      "Upload Resume";

  }

}


function parseResumeData(text) {

  text = text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ");

  const lines =
    text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

  /* RESET */

  resumeData = {

    ...resumeData,

    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    summary: "",
    skills: "",
    experience: [],
    education: [],
    projects: [],
    certifications: []

  };

  /* EMAIL */

  const email =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  if (email)
    resumeData.email = email[0];

  /* PHONE */

  const phone =
    text.match(
      /(\+91[\s-]?\d{5}[\s-]?\d{5})|(\d{10})/
    );

  if (phone)
    resumeData.phone = phone[0];

  /* LINKEDIN */

  const linkedin =
    text.match(
      /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s]+/i
    );

  if (linkedin)
    resumeData.linkedin = linkedin[0];

  /* GITHUB */

  const github =
    text.match(
      /(https?:\/\/)?(www\.)?github\.com\/[^\s]+/i
    );

  if (github)
    resumeData.github = github[0];

  /* NAME */
for (const line of lines) {

  const clean =
    line.trim();

  const lower =
    clean.toLowerCase();

  const invalidWords = [

    "summary",
    "skills",
    "education",
    "projects",
    "experience",
    "certificate",
    "resume"

  ];

  const validName =

    clean.length > 5 &&
    clean.length < 30 &&

    /^[A-Za-z\s]+$/.test(clean) &&

    !invalidWords.some(word =>
      lower.includes(word)
    );

  if (validName) {

    resumeData.name = clean;
    break;

  }

}

  /* TITLE */

  const titleKeywords = [

    "Data Analyst",
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Web Developer",
    "Data Scientist",
    "Intern"

  ];

  for (const title of titleKeywords) {

    if (
      text.toLowerCase()
        .includes(title.toLowerCase())
    ) {

      resumeData.title = title;
      break;

    }

  }

  /* LOCATION */

  const cities = [

    "Dharwad",
    "Bangalore",
    "Mumbai",
    "Delhi",
    "Pune",
    "Hyderabad",
    "Chennai"

  ];

  for (const city of cities) {

    if (
      text.toLowerCase()
        .includes(city.toLowerCase())
    ) {

      resumeData.location = city;
      break;

    }

  }

  /* SKILLS */

  const skills = [

    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Node.js",
    "MongoDB",
    "Express",
    "Python",
    "Java",
    "SQL",
    "Excel",
    "Power BI",
    "Tableau",
    "Machine Learning",
    "AI",
    "Pandas",
    "NumPy",
    "Matplotlib"

  ];

  const detectedSkills =
    skills.filter(skill =>
      text.toLowerCase()
        .includes(skill.toLowerCase())
    );

  resumeData.skills =
    detectedSkills.join(", ");

  /* SUMMARY */

  const summaryIndex =
    lines.findIndex(line =>
      /summary|profile|objective/i.test(line)
    );

  if (summaryIndex !== -1) {

    resumeData.summary =
  lines
    .slice(summaryIndex + 1, summaryIndex + 4)
    .join(" ")
    .replace(/[•]/g, "")
    .substring(0, 300);

  }

/* EXPERIENCE */

resumeData.experience = [];

const experienceKeywords = [

  "intern",
  "developer",
  "engineer",
  "analyst",
  "software"

];

const usedExperience =
  new Set();

lines.forEach(line => {

  const cleanLine =
    line.trim();

  const lower =
    cleanLine.toLowerCase();

  const validExperience =

    experienceKeywords.some(keyword =>
      lower.includes(keyword)
    ) &&

    cleanLine.length > 12 &&
    cleanLine.length < 90 &&

    !lower.includes("skills") &&
    !lower.includes("summary") &&
    !lower.includes("@") &&
    !lower.includes("python") &&
    !lower.includes("sql") &&
    !lower.includes("excel") &&
    !lower.includes("tableau") &&
    !lower.includes("power bi");

  if (

  validExperience &&

  !usedExperience.has(cleanLine) &&

  resumeData.experience.length < 4

) {

    usedExperience.add(cleanLine);

    const dateMatch =
      cleanLine.match(
        /(20\d{2}).?(20\d{2}|present)/i
      );

    resumeData.experience.push({

      role: cleanLine,

      company: "",

      duration:
        dateMatch
          ? dateMatch[0]
          : ""

    });

  }

});

/* EDUCATION */

const usedEducation =
  new Set();

resumeData.education = [];

lines.forEach(line => {

  const lower =
    line.toLowerCase();

  const validEducation =

    lower.includes("bachelor") ||
    lower.includes("b.sc") ||
    lower.includes("bca") ||
    lower.includes("computer science") ||
    lower.includes("engineering");

  if (

    validEducation &&

    line.length > 10 &&
    line.length < 120

  ) {

    resumeData.education.push({

      degree: line,

      college: ""

    });

  }

});


/* PROJECTS */

resumeData.projects = [];

const usedProjects =
  new Set();

lines.forEach(line => {

  const lower =
    line.toLowerCase();

  const validProject =

    (
      lower.includes("dashboard") ||
      lower.includes("analysis") ||
      lower.includes("system") ||
      lower.includes("application") ||
      lower.includes("website")
    ) &&

    line.length > 15 &&
    line.length < 100 &&

    !lower.includes("@") &&
    !lower.includes("linkedin") &&
    !lower.includes("skills");

  if (

    validProject &&

    !usedProjects.has(line)

  ) {

    usedProjects.add(line);

    resumeData.projects.push({

      name:
  line.replace(/^[-•]\s*/, ""),

      description: ""

    });

  }

});


/* CERTIFICATIONS */

resumeData.certifications = [];

const usedCertificates =
  new Set();

lines.forEach(line => {

  const lower =
    line.toLowerCase();

  const validCertificate =

    lower.includes("certificate") ||
    lower.includes("certification") ||
    lower.includes("course") ||
    lower.includes("forage") ||
    lower.includes("bootcamp");

  if (

    validCertificate &&

    line.length > 10 &&
    line.length < 120 &&

    !usedCertificates.has(line)

  ) {

    usedCertificates.add(line);

    resumeData.certifications.push({

      name: line

    });

  }

});

  syncInputs();

  renderAllSections();

  renderPreview();

  updateScore();

}