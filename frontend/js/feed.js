/* feed.js
   Load with: <script src="/js/feed.js" type="module"></script>
   Module scripts are deferred and run before DOMContentLoaded, so the DOM is
   ready, nothing leaks onto window, and the inline onclick="openImage()" is gone.
   (socket.io.js still loads first, so the `io` global exists.) */

const TOKEN_KEY = "accessToken";
const DEFAULT_AVATAR = "/images/default-avatar.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TOAST_MS = 3000;

const $ = (id) => document.getElementById(id);

const state = {
  me: null,
  socket: null,
  unread: 0,
  previewUrl: null,
  likes: new Map(),            // postId -> { liked, count, pending }
};

init();

async function init() {
  if (!localStorage.getItem(TOKEN_KEY)) return redirectToLogin();

  bindUI();
  if (!(await loadUser())) return;   // need my id first to compute "liked by me"
  await loadFeed();
  loadUnreadCount();                 // fire and forget
  connectSocket();                   // after the feed so loadFeed can't wipe a live post
}

/* ---------------- tiny DOM helper (safe by construction) ---------------- */

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children);           // strings become text nodes, never HTML
  return el;
}

/* ---------------- API ---------------- */

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;           // 0 = network failure
  }
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` };
  let payload;

  if (body instanceof FormData) {
    payload = body;                 // browser sets the multipart boundary
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "You appear to be offline.");
  }

  if (res.status === 401) {         // the ONLY case that logs the user out
    redirectToLogin();
    throw new ApiError(401, "Session expired");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY);
  state.socket?.disconnect();
  window.location.replace("/auth/login.html");
}

/* ---------------- helpers ---------------- */

function getImageUrl(path, fallback = DEFAULT_AVATAR) {
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) return path;

  const clean = path.replace(/^\/+/, "");
  if (/^(images|uploads)\//.test(clean)) return `/${clean}`;
  if (/^(posts|covers|avatars)\//.test(clean)) return `/uploads/${clean}`;
  if (!clean.includes("/")) return `/uploads/posts/${clean}`;
  return `/uploads/${clean}`;
}
// Better long-term: make the API always return a ready-to-use URL and delete this.

const myId = () => state.me?._id ?? state.me?.id;

// Handles likes as an array of ids or an array of populated users.
function isLikedBy(post, userId) {
  if (!userId) return false;
  return (post.likes || []).some((l) => String(l?._id ?? l) === String(userId));
}

function showNotification(msg) {
  const container = $("notificationContainer");
  if (!container) return;
  const toast = h("div", { class: "toast" }, msg);
  container.append(toast);
  setTimeout(() => toast.remove(), TOAST_MS);
}

function setBadge(count) {
  const badge = $("notificationBadge");
  if (!badge) return;
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.hidden = count <= 0;
}

function updateEmptyState() {
  $("emptyFeed")?.classList.toggle("hidden", $("feedPosts").children.length > 0);
}

/* ---------------- user / session ---------------- */

async function loadUser() {
  try {
    const user = await api("/auth/me");
    state.me = user;

    $("profileName").textContent = user.name || "User";
    $("profileHeadline").textContent = user.headline || "No headline added";

    const avatar = $("profileAvatar");
    avatar.addEventListener("error", () => { avatar.src = DEFAULT_AVATAR; }, { once: true });
    avatar.src = getImageUrl(user.avatar);
    return true;
  } catch (err) {
    if (err.status !== 401) showNotification(err.message);
    return false;
  }
}

async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* best effort */ }
  redirectToLogin();
}

async function loadUnreadCount() {
  try {
    const { count } = await api("/notifications/unread-count"); // adjust to your real route
    state.unread = count || 0;
    setBadge(state.unread);
  } catch { /* badge stays hidden */ }
}

/* ---------------- UI wiring ---------------- */

function bindUI() {
  ["navbarLogoutBtn", "profileLogoutBtn"].forEach((id) =>
    $(id)?.addEventListener("click", logout));

  $("postImage").addEventListener("change", onImageChosen);
  $("publishPost").addEventListener("click", publishPost);
  $("feedPosts").addEventListener("click", onFeedClick);
  window.addEventListener("pagehide", () => state.socket?.disconnect());
}

function onFeedClick(e) {
  const card = e.target.closest(".post-card");
  if (!card) return;

  if (e.target.closest(".like-btn")) {
    toggleLike(card.dataset.postId);
  } else if (e.target.closest(".post-card__media")) {
    openImage(card.querySelector("img").src);
  }
}

/* ---------------- composer ---------------- */

function clearPreview() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
  $("imagePreview").replaceChildren();
}

function onImageChosen(e) {
  clearPreview();                                   // also handles "user cancelled"
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    e.target.value = "";
    return showNotification("Please choose an image file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    e.target.value = "";
    return showNotification("Image must be under 5 MB.");
  }

  state.previewUrl = URL.createObjectURL(file);
  $("imagePreview").append(h("img", { src: state.previewUrl, alt: "Selected image preview" }));
}

async function publishPost() {
  const btn = $("publishPost");
  const textarea = $("postContent");
  const content = textarea.value.trim();
  const image = $("postImage").files[0];

  if (!content && !image) {
    showNotification("Post cannot be empty.");
    return textarea.focus();
  }

  const form = new FormData();
  if (content) form.append("content", content);
  if (image) form.append("image", image);

  btn.disabled = true;                              // no double-posts
  try {
    const post = await api("/posts", { method: "POST", body: form });
    textarea.value = "";
    $("postImage").value = "";
    clearPreview();
    renderPost(post, { prepend: true });
    updateEmptyState();
  } catch (err) {
    // Draft is preserved on failure, and a network error no longer logs you out.
    if (err.status !== 401) showNotification(err.message || "Couldn't publish. Try again.");
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- feed ---------------- */

function buildErrorState(onRetry) {
  return h("div", { class: "empty-state" },
    h("p", {}, "Couldn't load your feed."),
    h("button", { type: "button", class: "btn btn--primary btn--sm", onclick: null }, "Retry"),
  ).appendChild(document.createTextNode("")) && (() => {
    const box = h("div", { class: "empty-state" });
    const btn = h("button", { type: "button", class: "btn btn--primary btn--sm" }, "Retry");
    btn.addEventListener("click", onRetry);
    box.append(h("p", {}, "Couldn't load your feed."), btn);
    return box;
  })();
}

async function loadFeed() {
  const container = $("feedPosts");
  container.setAttribute("aria-busy", "true");
  container.replaceChildren(
    ...Array.from({ length: 3 }, () => h("div", { class: "skeleton skeleton-post" })),
  );

  try {
    const posts = await api("/posts/feed");
    container.replaceChildren();
    posts.forEach((p) => renderPost(p));
  } catch (err) {
    if (err.status !== 401) container.replaceChildren(buildErrorState(loadFeed));
  } finally {
    container.setAttribute("aria-busy", "false");
    updateEmptyState();
  }
}

function renderPost(post, { prepend = false } = {}) {
  const id = post?._id;
  if (!id || $(`post-${id}`)) return;               // dedupe (e.g. socket echo of your own post)

  state.likes.set(id, {
    liked: isLikedBy(post, myId()),
    count: post.likes?.length ?? 0,
    pending: false,
  });

  const card = h("article", { class: "post-card", id: `post-${id}`, dataset: { postId: id } },
    h("strong", { class: "post-author" }, post.author?.name || "User"),
    h("p", { class: "post-body" }, post.content || ""),
  );

  if (post.image) {
    card.append(
      h("button", { class: "post-card__media", type: "button", "aria-label": "View image full size" },
        h("img", { src: getImageUrl(post.image), alt: "Post image", loading: "lazy", decoding: "async" }),
      ),
    );
  }

  card.append(
    h("button", { class: "like-btn", type: "button" },
      h("span", { "aria-hidden": "true" }, "👍"),
      h("span", { class: "like-count" }, "0"),
    ),
  );

  const container = $("feedPosts");
  prepend ? container.prepend(card) : container.append(card);
  paintLike(id);
}

/* ---------------- likes ---------------- */

function paintLike(postId, { pop = false } = {}) {
  const s = state.likes.get(postId);
  const btn = $(`post-${postId}`)?.querySelector(".like-btn");
  if (!s || !btn) return;

  btn.setAttribute("aria-pressed", String(s.liked));
  btn.querySelector(".like-count").textContent = s.count;

  if (pop) {
    btn.classList.add("pop");
    btn.addEventListener("animationend", () => btn.classList.remove("pop"), { once: true });
  }
}

async function toggleLike(postId) {
  const s = state.likes.get(postId);
  if (!s || s.pending) return;

  const before = { liked: s.liked, count: s.count };
  s.pending = true;
  s.liked = !s.liked;                                // optimistic: +1 OR -1
  s.count += s.liked ? 1 : -1;
  paintLike(postId, { pop: s.liked });

  try {
    const res = await api(`/posts/${postId}/like`, { method: "POST" });
    s.liked = isLikedBy(res, myId());                // server is the source of truth
    s.count = res.likes?.length ?? s.count;
  } catch (err) {
    Object.assign(s, before);                        // rollback
    if (err.status !== 401) showNotification("Couldn't update your like.");
  } finally {
    s.pending = false;
    paintLike(postId);
  }
}

// Socket update: absolute values, so no "localUpdate" flag is needed.
function applyReactionUpdate(post) {
  const s = state.likes.get(post._id);
  if (!s || s.pending) return;                       // our own response will settle it
  s.count = post.likes?.length ?? s.count;
  s.liked = isLikedBy(post, myId());
  paintLike(post._id);
}

/* ---------------- lightbox ---------------- */

function openImage(src) {
  const opener = document.activeElement;
  const overlay = h("div", {
    class: "lightbox", role: "dialog", "aria-modal": "true",
    "aria-label": "Image viewer", tabindex: "-1",
  }, h("img", { src, alt: "Post image, enlarged" }));

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    opener?.focus?.();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  overlay.focus();
}

/* ---------------- realtime ---------------- */

function connectSocket() {
  if (!localStorage.getItem(TOKEN_KEY)) return;

  if (state.socket) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
  }

  const socket = io({
    // A function is re-run on every (re)connect, so a refreshed token is picked up.
    auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,                     // exponential backoff, retries forever
  });
  state.socket = socket;

  socket.on("connect_error", (err) => {
    console.error("Socket connection failed:", err.message);
    // If the server's auth middleware rejected us, socket.io will NOT retry on its own.
    if (!socket.active) redirectToLogin();
  });

  socket.on("newPost", (post) => {
    renderPost(post, { prepend: true });
    updateEmptyState();
  });

  socket.on("notification", (data) => {
    showNotification(data.message);
    setBadge(++state.unread);
  });

  socket.on("postReactionUpdate", applyReactionUpdate);
}