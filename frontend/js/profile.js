

(function () {

    if (window.PROCONNECT_SOCKET_INITIALIZED) {
        return;
    }

    window.PROCONNECT_SOCKET_INITIALIZED = true;

    if (typeof window.io !== "function") {
        console.error("Socket.IO client library not loaded");
        return;
    }

    if (!window.socket) {

        window.socket = window.io(
            window.PROCONNECT_CONFIG?.SOCKET_URL ||
            window.location.origin,
            {
                transports: ["websocket", "polling"],
                withCredentials: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,

                auth: {
                    token: window.getToken?.() || ""
                }
            }
        );

    }

    const socket = window.socket;

    window.refreshSocketAuth = function () {

        socket.auth = {
            token: window.getToken?.() || ""
        };

        if (socket.connected) {
            socket.disconnect();
        }

        socket.connect();

    };

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", error => {
        console.error("Socket connection error:", error.message);
    });

    socket.on("disconnect", reason => {
        console.warn("Socket disconnected:", reason);
    });

})();

socket.on("notificationUpdate",() => {
    loadCount();
  }
);

socket.off("newPost");
socket.on("newPost", () => {
  clearTimeout(feedReloadTimeout);
  feedReloadTimeout = setTimeout(() => {
    loadFeed();
  }, 1000);

});

window.addEventListener("beforeunload", () => {
  if (socket.connected) {
    socket.disconnect();
    clearTimeout(feedReloadTimeout);
  }
});

socket.off("postReactionUpdate");
socket.on("postReactionUpdate", (post) => {
  const btn = document.querySelector(`[data-post-id="${post._id}"] .like-btn`);
  if (btn) {
    btn.innerText = `👍 ${post.likes.length}`;
  }
});

let isRefreshingSocket = false;

function refreshSocketAuth() {
  if (isRefreshingSocket) return;
  isRefreshingSocket = true;
  socket.auth = {token: localStorage.getItem("accessToken")};
  if (socket.connected) {socket.disconnect();}
  socket.connect();
  socket.once("connect", () => {
    isRefreshingSocket = false;
  });

  socket.once("connect_error", () => {
    isRefreshingSocket = false;
  });
}


const params = new URLSearchParams(
  window.location.search
);

let viewOnly =params.get("viewOnly") === "true";


let toastContainer =document.querySelector(".toast-container");
if(!toastContainer){
 toastContainer =document.createElement("div");
 toastContainer.className ="toast-container";
 document.body.appendChild(toastContainer);
}


let lastFeedHash = "";

function hashPosts(posts) {
  let hash = 0;

  const sorted = posts.slice().sort((a, b) =>
    String(a._id).localeCompare(String(b._id))
  );

  for (const p of sorted) {
    const str =
      p._id +
      (p.likes?.length || 0) +
      (p.content || "") +
      (p.image || "");

    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
  }

  return hash;
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

let CURRENT_USER = null;

const $ = (id) => document.getElementById(id);

async function initProfilePage() {

    const data = await apiGet("/auth/me", {
        redirectOn401: false
    });

    if (!data) return;

    CURRENT_USER = data.user || data;

    if (!CURRENT_USER?._id) {
        throw new Error("User information unavailable");
    }

    const profileId =
        getProfileIdFromURL() || CURRENT_USER._id;

    const socket = window.socket;

    if (socket) {

        const joinProfile = () => {
            socket.emit("joinProfile", CURRENT_USER._id);
        };

        if (socket.connected) {
            joinProfile();
        } else {
            socket.once("connect", joinProfile);
        }

    }

    if (profileId !== CURRENT_USER._id) {
        await trackProfileVisit(profileId);
    }

    await Promise.all([
        loadProfile(profileId),
        loadFeed()
    ]);

    setupVisitorListener();

    await Promise.all([
        loadSuggestedUsers(),
        loadVisitors()
    ]);

}

function setupVisitorListener() {
  if (socket._visitorBound) return;

  const bind = () => {
    socket.off("newVisitor", handleNewVisitor);
    socket.on("newVisitor", handleNewVisitor);
  };

  if (socket.connected) {
    bind();
  } else {
    socket.once("connect", bind);
  }
  socket._visitorBound = true;
}

function getProfileIdFromURL() {
  return new URLSearchParams(window.location.search).get("id");
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value || "";
}


function getImageUrl(path, fallback = "/images/default-cover.jpg") {
  if (!path) {
    return fallback;
  }

  if (path.startsWith("http")) {
    return path;
  }

  if (
  path.startsWith("/uploads") ||
  path.startsWith("/images") ||
  path.startsWith("/resumes")
) {
    return window.location.origin + path;
  }

  return `${window.location.origin}/${path.replace(/^\/+/, "")}`;
}

async function loadProfile(profileId) {
  try {

    const isOtherProfile =
      profileId &&
      profileId !== CURRENT_USER._id;

    const user = isOtherProfile
      ? await apiGet(`/users/${profileId}`)
      : CURRENT_USER;

    if (!user) return;

    setText("name", user.name);
    setText("headline", user.headline);
    setText("location", user.location);
    setText("about", user.about);
    setText("email", user.email || "Not added");
    setText("phone", user.phone || "Not added");
    setText("address", user.address || "Not added");

    const profileImg = $("profile-img");

    if (profileImg) {
      profileImg.onerror = function () {
        this.onerror = null;
        this.src = "/images/default-avatar.png";
      };

      profileImg.src = getImageUrl(
        user.avatar,
        "/images/default-avatar.png"
      );
    }

    const coverImg = $("cover-img");

    if (coverImg) {
      coverImg.onerror = function () {
        this.onerror = null;
        this.src = "/images/default-cover.jpg";
      };

      coverImg.src = getImageUrl(
        user.cover,
        "/images/default-cover.jpg"
      );
    }

    setText(
      "connectionCount",
      user.connections?.length || 0
    );

    if ($("visitorCount")) {
      setText(
        "visitorCount",
        user.visitors?.length || 0
      );
    }

    const resumeLink = $("resumeLink");

    if (resumeLink) {
      if (user.resume) {
        resumeLink.href = getImageUrl(
          user.resume,
          ""
        );
        resumeLink.innerText = "View Resume";
        resumeLink.target = "_blank";
      } else {
        resumeLink.removeAttribute("href");
        resumeLink.innerText =
          "No resume uploaded";
      }
    }

    renderEducation(user.education || []);
    renderProjects(user.projects || []);
    renderCertificates(user.certificates || []);
    renderSkills(user.skills || []);


    viewOnly =Boolean(isOtherProfile) || params.get("viewOnly") === "true";

if (viewOnly) {
  disableProfileEditing();
}

  } catch (err) {
    console.error(
      "Profile load error:",
      err
    );
  }
}


window.openEdit = () => {

  if (viewOnly) return;

  $("editModal").style.display = "flex";

  ["name","headline","location","email","phone","address","about"]
    .forEach(id => {
      const input = $("edit" + capitalize(id));
      if (input) input.value = $(id).innerText;
    });
};

window.closeEdit = () => {
  $("editModal").style.display = "none";
};

window.saveProfile = async () => {
  if (viewOnly) return;
  const data = {
    name: $("editName").value,
    headline: $("editHeadline").value,
    location: $("editLocation").value,
    email: $("editEmail").value,
    phone: $("editPhone").value,
    address: $("editAddress").value,
    about: $("editAbout").value
  };

  await apiPut("/users/me", data);
  closeEdit();

  Object.entries(data).forEach(([key, value]) => {
    if ($(key)) $(key).innerText = value;
  });
};


if (viewOnly) {

  document
    .querySelectorAll(
      ".edit-btn,.save-btn,.delete-btn"
    )
    .forEach(btn => {
      btn.style.display = "none";
    });

}


if (viewOnly) {

  document
    .querySelectorAll(
      "input, textarea, select"
    )
    .forEach(field => {
      field.disabled = true;
      field.readOnly = true;
    });

}

const handleNewVisitor = (visitor) => {
  if (!visitor) return;

  const container = $("visitorsList");
  if (!container) return;

  const id = visitor._id || visitor.userId || visitor.email;
  if (!id) return;

  if (visitorIds.has(id)) return;
  visitorIds.add(id);

  const div = document.createElement("div");
  div.dataset.visitorId = id;

  const name = document.createElement("strong");
  name.textContent = visitor.name || "User";

  const headline = document.createElement("p");
  headline.textContent = visitor.headline || "";

  div.append(name, headline);
  container.prepend(div);

  const countEl = $("visitorCount");
  if (countEl) {
    countEl.innerText = String(visitorIds.size);
  }
};

const visitorIds = new Set();

async function loadVisitors() {
  const container = $("visitorsList");
  if (!container) return;

  const visitors = await apiGet("/users/visitors").catch(err => {
    console.error("Failed to load visitors:", err);
    return null;
  });
  if (!visitors) return;

  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  visitorIds.clear();

  visitors.forEach(v => {
    if (!v || !v.user) return;

    const id = v.user._id || v.user.id || v.user.email;
    if (!id || visitorIds.has(id)) return;

    visitorIds.add(id);

    const div = document.createElement("div");
    div.dataset.visitorId = id;

    const name = document.createElement("strong");
    name.textContent = v.user.name || "User";

    const headline = document.createElement("p");
    headline.textContent = v.user.headline || "";

    div.append(name, headline);
    fragment.appendChild(div);
  });

  container.appendChild(fragment);

  const countEl = $("visitorCount");
  if (countEl) {
    countEl.innerText = String(visitorIds.size);
  }
}


function renderSkills(skills) {

  const container =$("skillsList");
  container.innerHTML =skills.map((s, index) => `
    <div class="skill-chip">
      <input value="${escapeHTML(s.name || s)}" onchange="updateSkill(${index}, this.value)">
      <button onclick="deleteSkill(${index})"> × </button>
    </div>
  `).join("");
}

window.updateSkill = async (index,value) => {
  if (viewOnly) return;
  await apiPut(`/users/skills/${index}`,{ value });
};

window.deleteSkill = async (index) => {
  if (viewOnly) return;
  await apiDelete(`/users/skills/${index}`);
  CURRENT_USER.skills.splice(index,1);
  renderSkills(CURRENT_USER.skills);
};

window.addSkill = async () => {
  if (viewOnly) return;
  const input = $("skillInput");
  const skill = input.value.trim();
  if (!skill) return;

  await apiPost("/users/skills",{ skill });
  CURRENT_USER.skills.unshift({name: skill});
  renderSkills(CURRENT_USER.skills);
  input.value = "";
};


function renderProjects(list){
 const container =$("projectList");
 if(!container) return;
 container.innerHTML = "";
 const fragment =document.createDocumentFragment();
 list.forEach((p,index)=>{
  const card =document.createElement("div");
  card.className ="card-item editable-card";
  const title =document.createElement("input");
  title.value =p.title || "";
  title.onchange = () =>updateProject(index,"title",title.value);
  const desc =document.createElement("textarea");
  desc.value =p.description || "";
  desc.onchange = () =>updateProject(index,"description",desc.value);
  const del =document.createElement("button");
  del.textContent ="Delete";
  del.onclick = () =>deleteProject(index);
  card.append(title,desc,del);
  fragment.appendChild(card);
 });
 container.appendChild(fragment);
}

window.updateEducation = async (index,field,value) => {
  if (viewOnly) return;
  await apiPut(`/users/education/${index}`,
    { field, value }
  );
};

window.deleteEducation = async (index) => {
  if (viewOnly) return;
  await apiDelete(`/users/education/${index}`);
  CURRENT_USER.education.splice(index,1);
  renderEducation(CURRENT_USER.education);
};

window.addEducation = async () => {
  if (viewOnly) return;
  const collegeName =$("collegeName").value.trim();
  const degree =$("degree").value.trim();
  const result =$("result").value.trim();

  if (
    !collegeName ||
    !degree ||
    !result
  ) {

    return showToast(
      "Fill all fields",
      "error"
    );

  }

  const data = {
    collegeName,
    degree,
    result
  };

  try {
    await apiPost("/users/education",data);
    CURRENT_USER.education.unshift(data);
    renderEducation(CURRENT_USER.education);

    $("collegeName").value = "";
    $("degree").value = "";
    $("result").value = "";

    showToast("Education added","success");

  } catch (err) {
    console.error(err);
    showToast("Failed to add education","error");

  }

};


function renderEducation(list){
 const container = $("educationList");
 if(!container) return;
 container.innerHTML = "";
 if(!list.length){
  container.innerHTML = `
   <p class="empty-state">
    No education added
   </p>
  `;

  return;
 }

 const fragment =document.createDocumentFragment();
 list.forEach((e,index)=>{
  const card =document.createElement("div");
  card.className ="card-item editable-card";
  const college =document.createElement("input");
  college.value =e.collegeName || "";
  college.placeholder ="College Name";
  college.addEventListener("change",()=>{
    updateEducation(
     index,
     "collegeName",
     college.value.trim()
    );
   }
  );

  const degree =document.createElement("input");
  degree.value =e.degree || "";
  degree.placeholder ="Degree";

  degree.addEventListener("change",()=>{
    updateEducation(
     index,
     "degree",
     degree.value.trim()
    );
   }
  );

  const result =document.createElement("input");
  result.value =e.result || "";
  result.placeholder ="CGPA / Percentage";
  result.addEventListener("change",()=>{
    updateEducation(
     index,
     "result",
     result.value.trim()
    );
   }
  );

  const del =document.createElement("button");
  del.textContent ="Delete";
  del.addEventListener("click",()=>{
    deleteEducation(index);
   }
  );
  card.append(
   college,
   degree,
   result,
   del
  );

  fragment.appendChild(card);

 });

 container.appendChild(fragment);

}

window.addProject = async () => {
  if (viewOnly) return;
  const title =$("projectTitle").value.trim();
  const description =$("projectDesc").value.trim();
  if (!title || !description) {
    return showToast("Fill all fields","error"
    );
  }

  const data = {title,description};
  try {
    await apiPost("/users/projects",data);
    CURRENT_USER.projects?.unshift(data);
    renderProjects(CURRENT_USER.projects);
    $("projectTitle").value = "";
    $("projectDesc").value = "";
    showToast("Project added","success");
  } catch (err) {
    console.error(err);
    showToast("Failed to add project","error");
  }
};

window.updateProject = async (index,field,value) => {
  if (viewOnly) return;
  try {

    await apiPut(
      `/users/projects/${index}`,
      { field, value }
    );

    showToast(
      "Project updated",
      "success"
    );

  } catch (err) {

    console.error(err);

    showToast(
      "Update failed",
      "error"
    );

  }

};

window.deleteProject = async ( index) => {

  try {
    if (viewOnly) return;
    await apiDelete(`/users/projects/${index}`);
    CURRENT_USER.projects.splice(index, 1);
    renderProjects( CURRENT_USER.projects);
    showToast("Project deleted", "success");
  } catch (err) {
    console.error(err);
    showToast("Delete failed","error");
  }

};


function renderCertificates(list) {

  $("certificateList").innerHTML =list.map((c, index) => `
    <div class="card-item editable-card">
      <input value="${escapeHTML(c.name || "")}" onchange="updateCertificate(${index}, 'name', this.value)">
      <input value="${escapeHTML(c.organization || "")}" onchange="updateCertificate(${index}, 'organization', this.value)">
      <button onclick="deleteCertificate(${index})">Delete</button>
    </div>

  `).join("");
}

window.updateCertificate = async (index,field,value) => {
  if (viewOnly) return;
  await apiPut(`/users/certificates/${index}`,
    { field, value }
  );
};

window.deleteCertificate = async (index) => {
  if (viewOnly) return;
  await apiDelete(`/users/certificates/${index}`);
  CURRENT_USER.certificates.splice(index,1);
  renderCertificates(CURRENT_USER.certificates);
};

window.addCertificate = async () => {
  if (viewOnly) return;
  const data = {name: $("certName").value,organization: $("certOrg").value};
  await apiPost("/users/certificates",data);
  CURRENT_USER.certificates.unshift(data);
  renderCertificates(CURRENT_USER.certificates);

  $("certName").value = "";
  $("certOrg").value = "";
};

const resumeUpload = $("resumeUpload");

if (resumeUpload) {
  resumeUpload.addEventListener("change",async function () {
      const file = this.files[0];
      if (!file) return;
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];

      if (!allowedTypes.includes(file.type)) {
        return alert("Only PDF or DOC/DOCX files allowed");
      }

      if (file.size > 5 * 1024 * 1024) {
        return alert("Resume must be under 5MB");
      }

      const formData = new FormData();
      formData.append("resume", file);

      try {
        const data = await apiRequest("/users/resume",
          {
            method: "POST",
            body: formData
          }
        );

        if (!data.resume) {
          throw new Error(
            "Resume URL missing"
          );
        }

        const resumeLink = $("resumeLink");
        if (resumeLink) {
          const resumeUrl =data.resume.startsWith("http")? data.resume: getImageUrl(data.resume, "");
          resumeLink.href = resumeUrl;
          resumeLink.innerText ="View Resume";
          resumeLink.target ="_blank";
        }
        alert("✅ Resume uploaded successfully");
      } catch (err) {
        console.error("❌ Resume upload failed:",err);
        alert(err.message ||"Resume upload failed");
      }
    }
  );
}

let isLoadingFeed = false;
let lastFeedLoad = 0;

async function loadFeed() {
  const now = Date.now();
  if (now - lastFeedLoad < 2000) {
    return;
  }

  lastFeedLoad = now;

  if (isLoadingFeed) return;
  isLoadingFeed = true;
  const container = $("feedPosts");
  if (container && !container.dataset.loaded) {
    container.innerHTML = "<p>Loading feed...</p>";
  }

  try {
    const posts = await apiGet("/posts/feed")
      .catch(err => {
        console.error("Feed load failed:", err);
        return null;
      });

    if (!posts || !container) return;

    const newHash = hashPosts(posts);
    if (newHash === lastFeedHash) {
      return;
    }

    lastFeedHash = newHash;
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const seen = new Set();
    posts.forEach(post => {

      if (!post || !post._id || seen.has(post._id)) {
        return;
      }

      seen.add(post._id);

      const div = document.createElement("div");
      div.className = "post-card";
      div.dataset.postId = post._id;
      const author = post.author?.name || "User";
      const content = post.content || "";
      const nameEl = document.createElement("b");
      nameEl.textContent = author;
      const contentEl = document.createElement("p");
      contentEl.textContent = content;
      div.appendChild(nameEl);
      div.appendChild(contentEl);

      if (
        post.image &&
        typeof post.image === "string"
      ) {

        const img = document.createElement("img");
        img.className = "post-image";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = "Post image";
        img.onerror = function () {
          this.onerror = null;
          this.src = "/images/default-cover.jpg";
        };

        img.src = getImageUrl(post.image,"/images/default-cover.jpg");
        div.appendChild(img);
      }

      const btn = document.createElement("button");
      btn.className = "like-btn";
      btn.innerText =`👍 ${post.likes?.length || 0}`;
      btn.addEventListener("click", () => {
        likePost(post._id, btn);
      });

      div.appendChild(btn);
      fragment.appendChild(div);
    });

    container.appendChild(fragment);
    container.dataset.loaded = "true";

  } finally {

    isLoadingFeed = false;
  }
}

window.likePost = async (id,btn) => {
  if (
    btn.disabled ||
    btn.dataset.loading === "true"
  ) return;
  btn.dataset.loading = "true";
  btn.disabled = true;
  try {
    await apiPost(`/posts/${id}/like`);
  } catch (err) {
    console.error("Like failed:",err);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.dataset.loading = "false";
    }, 500);
  }
};

const coverUpload = $("coverUpload");

if (coverUpload) {
  coverUpload.addEventListener("change", async function () {

    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return alert("Please upload an image file");
    }

    if (file.size > 5 * 1024 * 1024) {
      return alert("Image must be under 5MB");
    }

    const formData = new FormData();
    formData.append("cover", file);

    try {

  const data = await apiRequest("/users/cover",
    {
      method: "POST",
      body: formData
    }
  );

  if (!data.cover) {
    throw new Error(
      "Cover URL missing"
    );
  }

  const img = $("cover-img");
  if (!img) return;
  const imageUrl =getImageUrl(data.cover);
  const newSrc =imageUrl + "?t=" + Date.now();
  img.style.opacity = "0.5";
  img.onload = () => {img.style.opacity = "1";};
  img.onerror = () => {
    img.onerror = null;
    img.src ="/images/default-cover.jpg";
    img.style.opacity = "1";
  };
  img.src = newSrc;
} catch (err) {
  console.error("❌ Cover upload failed:",err);
  alert(err.message ||"Cover upload failed");
}

  });
}

const profileUpload = $("avatarUpload");
if (profileUpload) {profileUpload.addEventListener("change",async function () {
      const file = this.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        return alert("Please upload an image file");
      }

      if (file.size > 5 * 1024 * 1024) {
        return alert("Image must be under 5MB");
      }

      const formData = new FormData();
      formData.append("avatar", file);
      try {
        const data = await apiRequest("/users/upload-avatar",{
            method: "POST",
            body: formData
          }
        );

        if (!data.avatar) {throw new Error("Avatar URL missing"
  );
}

        const img = $("profile-img");
        if (!img) return;
        const imageUrl =getImageUrl(data.avatar);
        img.onload = () => {img.style.opacity = "1";};
        img.onerror = () => {
          img.onerror = null;
          img.src ="/images/default-avatar.png";
        };

        img.style.opacity = "0.5";
        img.src =imageUrl + "?t=" + Date.now();
        alert("✅ Profile image uploaded");

      } catch (err) {
        console.error("❌ Avatar upload failed:",err);
        alert(err.message ||"Avatar upload failed");
      }
    }
  );
}


async function loadSuggestedUsers() {
  const container = document.getElementById("suggestedUsers");
  if (!container) return;

  container.textContent = "Loading suggestions...";

  try {
    const result = await apiGet("/users/suggestions");

    const users = Array.isArray(result)
      ? result
      : result?.users || result?.suggestions || result?.data || [];

    container.replaceChildren();

    if (!users.length) {
      container.textContent = "No suggestions available.";
      return;
    }

    const fragment = document.createDocumentFragment();

    users.forEach((user) => {
      const userId = user._id || user.id;
      if (!userId) return;

      const card = document.createElement("div");
      card.className = "suggestion-item";

      const avatar = document.createElement("img");
      avatar.className = "suggestion-avatar";
      avatar.src = getImageUrl(
        user.avatar || user.profileImage,
        "/images/default-avatar.png"
      );
      avatar.alt = `${user.name || "User"} profile picture`;

      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = "/images/default-avatar.png";
      };

      const details = document.createElement("div");
      details.className = "suggestion-details";

      const name = document.createElement("h4");
      name.textContent = user.name || "ProConnect Member";

      const headline = document.createElement("p");
      headline.textContent = user.headline || user.title || "Member";

      const viewButton = document.createElement("a");
      viewButton.className = "view-profile-btn";
      viewButton.href =
        `/user/profile.html?id=${encodeURIComponent(userId)}`;
      viewButton.textContent = "View Profile";

      const followButton = document.createElement("button");
      followButton.className = "follow-btn";
      followButton.type = "button";
      followButton.textContent = "Follow";

      followButton.addEventListener("click", async () => {
        if (followButton.disabled) return;

        followButton.disabled = true;

        try {
          await apiPost(`/users/follow/${encodeURIComponent(userId)}`);
          followButton.textContent = "Following";
          showToast("User followed successfully.", "success");
        } catch (error) {
          console.error("Follow error:", error);
          followButton.disabled = false;
          showToast("Failed to follow user.", "error");
        }
      });

      details.append(name, headline);
      card.append(avatar, details, viewButton, followButton);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  } catch (error) {
    console.error("Load suggestions error:", error);
    container.textContent = "Unable to load suggestions.";
  }

}

window.followUser = async (id) => {
  await apiPost(`/users/follow/${id}`);
  loadSuggestedUsers();
};

window.logout = async () => {

    if (window.ProConnectAuth?.logout) {
        await window.ProConnectAuth.logout();
        return;
    }

    window.socket?.disconnect();
    window.clearAuth?.();
    window.location.replace("/auth/login.html");

};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function trackProfileVisit(id) {
  const key =`viewed_${id}_${new Date().toDateString()}`;
  if (sessionStorage.getItem(key)) {
    return;
  }

  try {
    await apiPost(`/users/view/${id}`);
    sessionStorage.setItem(key, "true");
  } catch (err) {
    console.error("Visitor tracking failed",err);
  }
}


let badge = null;
document.addEventListener("DOMContentLoaded", async () => {
  badge = document.getElementById("notificationBadge");
  try {
    await requireAuth();
    await initProfilePage();
    await loadCount();
  } catch (err) {
    console.error(err);
    window.location ="/auth/login.html";
  }
});

async function loadCount() {
  try {
    const data = await apiGet("/notifications/unread-count");
    if (badge) {
      badge.innerText =data.count > 0? data.count: "";
    }
  } catch (err) {
    console.error("Notification count error:",err);
  }
}


function cleanupSocket(){
 socket.off("connect");
 socket.off("disconnect");
 socket.off("connect_error");
 socket.off("newPost");
 socket.off("newVisitor");
 socket.off("notificationUpdate");
 socket.off("postReactionUpdate");
}

window.addEventListener("offline",()=>{showToast("You are offline");});
window.addEventListener("online",()=>{showToast("Back online","success");});


async function safeRequest(fn,fallback = null){
 try{
  return await fn();
 }catch(err){
  console.error(err);
  return fallback;
 }
}

function updateNetworkStatus(){
 const el =$("networkStatus");
 if(!el) return;
 if(navigator.onLine){
  el.textContent = "🟢 Online";
 }else{
  el.textContent ="🔴 Offline";
 }
}

window.addEventListener("online",updateNetworkStatus);
window.addEventListener("offline",updateNetworkStatus);
updateNetworkStatus();


function showToast( message,type = "info"){
 const toast =document.createElement("div");
 toast.className =`toast toast-${type}`;
 toast.textContent =message;
 toastContainer.appendChild(toast);
 requestAnimationFrame(() => {toast.classList.add("show");});
 setTimeout(() => {
  toast.classList.remove("show");
  setTimeout(() => {toast.remove();},300);
 },3000);
}


function disableProfileEditing() {

  document.querySelectorAll(".edit-btn, .edit-profile-btn").forEach(el => {
      el.style.display = "none";
    });

  document.querySelectorAll(".form-inline").forEach(el => {
      el.style.display = "none";
    });


  const createPostCard = document.querySelector(  ".create-post-card" );

  if (createPostCard) {
    createPostCard.style.display = "none";
  }


  document.querySelectorAll(  ".editable-card input, .editable-card textarea")
    .forEach(el => {
      el.readOnly = true;
      el.disabled = true;
    });

  
  document .querySelectorAll( ".editable-card button").forEach(btn => {
      btn.style.display = "none";
    });

  
  [
    "avatarUpload",
    "coverUpload",
    "resumeUpload"
  ].forEach(id => {
    const el =document.getElementById(id);

    if (el) {
      el.style.display = "none";
    }
  });

}

function renderPeopleSuggestions(people) {
    const container = document.getElementById("peopleSuggestions");

    if (!container) return;

    if (!Array.isArray(people) || people.length === 0) {
        container.innerHTML = "<p>No suggestions available.</p>";
        return;
    }

    container.replaceChildren();

    people.forEach((person) => {
        const userId = person._id || person.id;
        if (!userId) return;

        const card = document.createElement("div");
        card.className = "person-suggestion";

        const img = document.createElement("img");
        img.src = person.avatar || person.profileImage || "/images/default-avatar.png";
        img.alt = "";
        img.onerror = () => {
            img.onerror = null;
            img.src = "/images/default-avatar.png";
        };

        const info = document.createElement("div");
        info.className = "person-info";

        const name = document.createElement("h4");
        name.textContent = person.name || "ProConnect Member";

        const headline = document.createElement("p");
        headline.textContent = person.headline || person.title || "Member";

        info.append(name, headline);

        const actions = document.createElement("div");
        actions.className = "person-actions";

        const viewButton = document.createElement("a");
        viewButton.className = "view-profile-btn";
        viewButton.href = `/user/profile.html?id=${encodeURIComponent(userId)}`;
        viewButton.textContent = "View Profile";

        const followButton = document.createElement("button");
        followButton.className = "follow-btn";
        followButton.textContent = "Follow";
        followButton.dataset.userId = userId;

        actions.append(viewButton, followButton);
        card.append(img, info, actions);
        container.appendChild(card);
    });

}