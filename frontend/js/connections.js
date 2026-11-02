console.log("🚀 connections.js loaded");

let socket = null;
let currentUser = null;
async function apiGet(url) {

  const token =localStorage.getItem("accessToken");

  const res = await fetch(`/api${url}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`
      }
    }
  );

  if (res.status === 401) {
    redirectToLogin();
    return [];
  }

  if (!res.ok) {
    throw new Error(
      `GET ${url} failed`
    );
  }

  return await res.json();
}

async function apiPost(url,body = {}) {

  const token =localStorage.getItem("accessToken");

  const res = await fetch(`/api${url}`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:`Bearer ${token}`
      },

      body: JSON.stringify(body)
    }
  );

  if (res.status === 401) {
    redirectToLogin();
    return;
  }

  if (!res.ok) {

    const err = await res.json().catch(() => ({}));

throw new Error(
  err.message || `HTTP ${res.status}`
);

    
  }

  return await res.json();
}


function redirectToLogin() {
  socket?.disconnect();
  socket = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.location.replace("/auth/login.html");
}

async function requireAuth() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    const user = await res.json();

if (!user?._id) {
  redirectToLogin();
  return null;
}

localStorage.setItem("user",JSON.stringify(user));

return user;

  } catch (err) {
    console.error("❌ Auth error:", err.message);
    redirectToLogin();
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  currentUser = user;

  console.log("✅ Authenticated:", user._id);

  setupSocket();
  setupSearch();

  await Promise.all([
    loadRequests(),
    loadConnections(),
    loadSuggestions()
  ]);
});

function setupSocket() {

  if (socket?.connected) return;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io("http://localhost:5000", {
    auth: {
      token: localStorage.getItem("accessToken")
    },
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    updateStatus("online");
    console.log("✅ SOCKET CONNECTED:", socket.id);

    loadRequests();
    loadConnections();
    loadSuggestions();
  });

  socket.on("disconnect", reason => {
  updateStatus("offline");
  console.log("Disconnected:", reason);
});

  socket.on("reconnect", () => {
  updateStatus("online");

  loadRequests();
  loadConnections();
  loadSuggestions();
});

  socket.on("connect_error", (err) => {
    updateStatus("offline");
    console.error("❌ SOCKET ERROR:", err.message);
  });

  socket.on("connectionRequest", (data) => {
    if (
      document.querySelector(
        `#requestsList [data-id="${data._id}"]`
      )
    ) return;

    addRequestToUI(data);
  });

  socket.on("connectionAccepted", (data) => {
    document.querySelector(
      `#requestsList [data-id="${data._id}"]`
    )?.remove();

    updatePendingEmpty();
    loadConnections();
  });

  socket.on("connectionRejected", (data) => {
    document.querySelector(
      `#requestsList [data-id="${data._id}"]`
    )?.remove();

    updatePendingEmpty();
    loadRequests();
  });

  socket.on("newSuggestion", () => {
    loadSuggestions();
  });
}

function updateStatus(state) {
  const el = document.getElementById("socketStatus");
  if (!el) return;

  const isOnline = state === "online";

  el.textContent = isOnline ? "● Connected" : "● Disconnected";
  el.classList.remove("online", "offline");
  el.classList.add(isOnline ? "online" : "offline");
}


function setupSearch() {
  const input =
    document.getElementById("connectionSearch");

  if (!input) return;

  input.addEventListener(
    "input",
    debounce(filterConnections, 300)
  );
}

async function loadRequests() {
  try {
    const requests = await apiGet("/connections/requests");
    const container = document.getElementById("requestsList");
    const empty = document.getElementById("pendingEmpty");

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(requests) || requests.length === 0) {
      if (empty) empty.style.display = "block";
      return;
    }

    if (empty) {empty.style.display = "none";}

    requests.forEach(req => {
      container.appendChild(createRequestCard(req));
    });
    filterConnections();

  } catch (err) {
    console.error("Load requests error:", err);
  }
}

async function loadConnections() {
  const container = document.getElementById("acceptedList");
  const empty = document.getElementById("acceptedEmpty");
  const loader = document.getElementById("connectionsLoader");

  if (!container) return;
  container.innerHTML = "";

  if (empty) {
    empty.style.display = "none";
  }

  if (loader) {
    loader.style.display = "block";
  }

  try {

    const users = await apiGet("/connections");

    if (loader) {
      loader.style.display = "none";
    }

    if (!Array.isArray(users) || users.length === 0) {

      if (empty) {
        empty.style.display = "block";
      }

      return;
    }
    const uniqueUsers = Array.from(
      new Map(users.map(user => [user._id, user])).values()
    );

    const fragment = document.createDocumentFragment();
    uniqueUsers.forEach(u => {
      const div = document.createElement("div");
      div.className = "connection-card";
      div.style.cursor = "pointer";

div.addEventListener("click",() => {
    window.location.href =`/user/profile.html?id=${u._id}`;
  }
);

      div.dataset.search = `${u.name || ""} ${u.headline || ""}`.toLowerCase();

      div.innerHTML = `
  <img
    class="avatar"
    src="${u.avatar || "/images/default-avatar.png"}"
    alt="${u.name || "User"}"
  >

  <div class="connection-info">
    <h4>${u.name || "Unknown User"}</h4>
    <p>${u.headline || ""}</p>
  </div>
`;

      const avatar =div.querySelector(".avatar");

avatar.onerror = function () {
  this.onerror = null;
  this.src ="/images/default-avatar.png";
};
      fragment.appendChild(div);
    });

    container.appendChild(fragment);
    filterConnections();
  } catch (err) {

    console.error("Load connections error:", err);

    if (loader) {
      loader.style.display = "none";
    }

    if (empty) {
      empty.style.display = "block";
    }
  }
}


let suggestionsLoading = false;
let suggestionsReloadPending = false;

async function loadSuggestions() {
    const container = document.getElementById("suggestions");
    const empty = document.getElementById("suggestionsEmpty");

    if (!container) return;

    // Prevent simultaneous requests from initial load and Socket.IO.
    if (suggestionsLoading) {
        suggestionsReloadPending = true;
        return;
    }

    suggestionsLoading = true;

    try {
        const raw = await apiGet("/connections/people-you-may-know");

        if (!Array.isArray(raw)) {
            throw new Error("Invalid suggestions response");
        }

        const currentUserId = String(currentUser?._id || "");
        const seenIds = new Set();
        const users = [];

        for (const user of raw) {
            if (!user?._id) continue;

            const userId = String(user._id);

            // Exclude the logged-in user and duplicate IDs.
            if (userId === currentUserId || seenIds.has(userId)) {
                continue;
            }

            seenIds.add(userId);
            users.push(user);
        }

        // Build the new cards before replacing the current list.
        const fragment = document.createDocumentFragment();

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "connection-card";
            card.dataset.userId = String(user._id);

            card.addEventListener("click", () => {
                window.location.href =
                    `/user/profile.html?id=${encodeURIComponent(user._id)}`;
            });

            const img = document.createElement("img");
            img.className = "avatar";
            img.src = user.avatar || "/images/default-avatar.png";
            img.alt = user.name || "User";

            img.onerror = function () {
                this.onerror = null;
                this.src = "/images/default-avatar.png";
            };

            const info = document.createElement("div");
            info.className = "connection-info";

            const name = document.createElement("h4");
            name.textContent = user.name || "User";

            const headline = document.createElement("p");
            headline.textContent = user.headline || "";

            const mutual = document.createElement("small");
            mutual.textContent =
                `${user.mutualCount || 0} mutual connections`;

            info.append(name, headline, mutual);

            const btn = document.createElement("button");
            btn.className = "connect-btn";
            btn.textContent = "Connect";

            btn.addEventListener("click", async event => {
                event.stopPropagation();

                if (btn.disabled) return;

                btn.disabled = true;
                btn.textContent = "Sending...";

                try {
                    await sendRequest(user._id);

                    // Remove the person from suggestions after success.
                    card.remove();

                    if (empty) {
                        empty.style.display =
                            container.children.length === 0
                                ? "block"
                                : "none";
                    }
                } catch (err) {
                    console.error("Connection request failed:", err);

                    btn.disabled = false;
                    btn.textContent = "Connect";
                }
            });

            card.append(img, info, btn);
            fragment.appendChild(card);
        });

        container.replaceChildren(fragment);

        if (empty) {
            empty.style.display = users.length === 0 ? "block" : "none";
        }

    } catch (err) {
        console.error("Suggestions error:", err);
    } finally {
        suggestionsLoading = false;

        // Run one additional refresh if an event occurred during loading.
        if (suggestionsReloadPending) {
            suggestionsReloadPending = false;
            loadSuggestions();
        }
    }
  }

function createRequestCard(req) {
  if (!req || !req.sender) {
    console.warn("Invalid request:", req);
    return document.createElement("div");
  }

  const div = document.createElement("div");

  div.className = "connection-card";
  div.dataset.id = req._id;
  div.style.cursor = "pointer";

  div.dataset.search =`${req.sender.name || ""} ${req.sender.headline || ""}`.toLowerCase();

div.addEventListener(
  "click",
  () => {
    window.location.href =
      `/user/profile.html?id=${req.sender._id}`;
  }
);

  div.innerHTML = `
    <img 
      class="avatar" 
      src="${req.sender.avatar || "/images/default-avatar.png"}"
      alt="${req.sender.name}"
    >

    <div class="connection-info">
      <h4>${req.sender.name || "Unknown User"}</h4>
      <p>${req.sender.headline || ""}</p>
    </div>

    <div class="actions">
      <button class="accept-btn">Accept</button>
      <button class="reject-btn">Reject</button>
    </div>
  `;

  const acceptBtn = div.querySelector(".accept-btn");
  const rejectBtn = div.querySelector(".reject-btn");

  acceptBtn?.addEventListener("click",(e) => {
    e.stopPropagation();
    accept(req._id);
  }
);
  rejectBtn?.addEventListener(
  "click",
  (e) => {
    e.stopPropagation();
    reject(req._id);
  }
);

  return div;
}

function addRequestToUI(req) {
  if (document.querySelector(`[data-id="${req._id}"]`)) return;
  const container = document.getElementById("requestsList");
  container?.prepend(createRequestCard(req));
  updatePendingEmpty();
}

function updatePendingEmpty() {
  const container = document.getElementById("requestsList");
  const empty = document.getElementById("pendingEmpty");

  if (!container || !empty) return;

  empty.style.display =container.children.length === 0 ? "block" : "none";
}

async function accept(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  const buttons = card.querySelectorAll("button");
  buttons.forEach(btn => btn.disabled = true);

  try {
    await apiPost(`/connections/accept/${id}`);

    card.remove();
    updatePendingEmpty();

    await loadConnections();

  } catch (err) {
    console.error(err);

    buttons.forEach(btn => btn.disabled = false);
  }
}

async function reject(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  const buttons = card.querySelectorAll("button");
  buttons.forEach(btn => btn.disabled = true);

  try {
    await apiPost(`/connections/reject/${id}`);

    card.remove();
    updatePendingEmpty();

  } catch (err) {
    console.error(err);

    buttons.forEach(btn => btn.disabled = false);
  }
}

async function sendRequest(userId) {
  try {
    await apiPost(`/connections/request/${userId}`);
    loadSuggestions();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

window.addEventListener("beforeunload", () => {
  socket?.disconnect();
});

function filterConnections() {
  const value =document.getElementById("connectionSearch")?.value.trim().toLowerCase() || "";
  const cards =document.querySelectorAll("#acceptedList .connection-card");

  let visible = 0;

  cards.forEach(card => {
    const text =card.dataset.search ||card.textContent.toLowerCase();
    const match =text.includes(value);

    card.style.display =match ? "flex" : "none";

    if (match) visible++;
  });

  const empty =
    document.getElementById("searchEmpty");

  if (empty) {
    empty.classList.toggle(
      "hidden",
      visible > 0 || value === ""
    );
  }
}