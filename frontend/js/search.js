
const searchInput = document.getElementById("globalSearch");
const resultsContainer = document.getElementById("searchResults");

let debounceTimer;
let controller;

let lastQuery = "";

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);

  const q = searchInput.value.trim();

  if (q === lastQuery) return;
  lastQuery = q;

  // empty input
  if (!q) {
    if (controller) controller.abort();
    resultsContainer.innerHTML = "";
    return;
  }

  // too short
  if (q.length < 2) {
    if (controller) controller.abort();
    resultsContainer.innerHTML = "<p>Type at least 2 characters</p>";
    return;
  }

  debounceTimer = setTimeout(() => {
    performSearch(q);
  }, 300);
});

async function performSearch(q) {
  try {
    if (controller) controller.abort();
    controller = new AbortController();

    resultsContainer.innerHTML = "<p>🔍 Searching...</p>";

    const token = localStorage.getItem("accessToken");

    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });

    const data = await res.json();

    renderSearch(data);

  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Search error:", err);
      resultsContainer.innerHTML = "<p>❌ Failed to search</p>";
    }
  }
}


function renderSearch(data = {}) {
  resultsContainer.innerHTML = "";

  const users = Array.isArray(data.users) ? data.users : [];
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const posts = Array.isArray(data.posts) ? data.posts : [];

  if (!users.length && !jobs.length && !posts.length) {
    resultsContainer.innerHTML = "<p>No results found</p>";
    return;
  }

  const fragment = document.createDocumentFragment();

  // USERS
  if (users.length) {
    const title = document.createElement("h4");
    title.textContent = "👤 Users";
    fragment.appendChild(title);

    users.forEach(user => {
      const div = document.createElement("div");
      div.className = "search-item";

      const name = document.createElement("strong");
      name.textContent = user.name;

      const headline = document.createElement("p");
      headline.textContent = user.headline || "";

      div.appendChild(name);
      div.appendChild(headline);

      div.onclick = () => {
        window.location.href = `/user/profile.html?id=${user._id}`;
      };

      fragment.appendChild(div);
    });
  }

  // JOBS
  if (jobs.length) {
    const title = document.createElement("h4");
    title.textContent = "💼 Jobs";
    fragment.appendChild(title);

    jobs.forEach(job => {
      const div = document.createElement("div");
      div.className = "search-item";

      const titleEl = document.createElement("strong");
      titleEl.textContent = job.title;

      const meta = document.createElement("p");
      meta.textContent = `${job.company || ""} • ${job.location || ""}`;

      div.appendChild(titleEl);
      div.appendChild(meta);

      div.onclick = () => {
        window.location.href = `/pages/jobs.html?jobId=${job._id}`;
      };

      fragment.appendChild(div);
    });
  }

  // POSTS
  if (posts.length) {
    const title = document.createElement("h4");
    title.textContent = "📝 Posts";
    fragment.appendChild(title);

    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = "search-item";

      const content = document.createElement("p");
      content.textContent = (post.content || "").substring(0, 80) + "...";

      div.appendChild(content);

      div.onclick = () => {
        window.location.href = `/pages/post.html?id=${post._id}`;
      };

      fragment.appendChild(div);
    });
  }

  resultsContainer.appendChild(fragment);
}