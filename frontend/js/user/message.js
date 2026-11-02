
const socket = io("/", {
  transports: ["websocket"],
  auth: {
    token: localStorage.getItem("accessToken")
  }
});

let currentUser = null;
let activeChatUser = null;
let unreadCounts = {};

async function init() {

  try {

    currentUser = await apiGet("/auth/me");

    if (!currentUser) return;

    socket.emit(
      "join",
      currentUser._id
    );

    loadConversations();

  } catch (err) {

    console.error(
      "Init error:",
      err
    );

    window.location =
      "/auth/login.html";

  }

}


function getFileUrl(path = "") {

  if (!path) {
    return "/images/default-avatar.png";
  }

  if (path.startsWith("http")) {
    return path;
  }

  return path;
}

init();

async function loadConversations() {

  const users =
    await apiGet("/users");

  const list =
    document.getElementById(
      "conversationList"
    );

  list.innerHTML = "";

  users.forEach(user => {

    if (
      user._id === currentUser._id
    ) return;

    const div =
      document.createElement("div");

    div.className =
      "conversation-item";

    div.dataset.userid =
      user._id;

    const profilePic =
      user.profilePicture ||
      "/images/default-avatar.png";

    div.innerHTML = `
      <div class="conv-avatar">

        <img src="${profilePic &&
        profilePic.startsWith("http")
        ? profilePic
        : getFileUrl(user.profilePicture)
      }"
          alt="${user.name}">

        <span
          class="online-badge"
          id="online-${user._id}">
        </span>

      </div>

      <div class="conv-details">

        <div class="conv-name-row">

          <div class="conv-name">
            ${escapeHTML(user.name)}
          </div>

          <div class="conv-time">
            Now
          </div>

        </div>

        <div class="conv-message">
          Click to chat
        </div>

      </div>

      <div
        class="unread-dot"
        id="badge-${user._id}"
        style="display:none">
      </div>
    `;

    div.onclick = () =>
      openChat(user);

    list.appendChild(div);

  });

}

async function openChat(user) {

  const currentUserId =
    currentUser._id;

  const chatUserId =
    user._id;

  document
    .querySelectorAll(
      ".conversation-item"
    )
    .forEach(item =>
      item.classList.remove("active")
    );

  const activeItem =
    document.querySelector(
      `[data-userid="${chatUserId}"]`
    );

  if (activeItem) {
    activeItem.classList.add("active");
  }

  if (activeChatUser) {

    socket.emit("leaveChat", {
      userId: currentUserId,
      otherUserId: activeChatUser
    });

  }

  activeChatUser =
    chatUserId;

  document.getElementById(
    "chatUser"
  ).innerText =
    user.name;

  document.getElementById(
    "chatAvatar"
  ).innerHTML = `
    <img
      src="${user.profilePicture
      ? (
        user.profilePicture.startsWith("http")
          ? user.profilePicture
          : API + user.profilePicture
      )
      : "/images/default-avatar.png"
    }"
      alt="${user.name}">
  `;

  const container =
    document.getElementById(
      "messages"
    );

  container.innerHTML = "";

  clearUnread(chatUserId);

  socket.emit("joinChat", {
    userId: currentUserId,
    otherUserId: chatUserId
  });

  let messages = [];

  try {

    messages =
      await apiGet(
        `/messages/${chatUserId}`
      );

  } catch (err) {

    console.error(err);

  }

  if (!messages.length) {

    container.innerHTML = `
      <div class="chat-placeholder">

        <i class="fa-regular fa-comments"></i>

        <p>
          Start chatting
        </p>

      </div>
    `;

    return;

  }

  messages.forEach(msg => {
    console.log("MESSAGE:", msg);

    if (msg.image) {

      appendImageMessage(
        msg.image,
        msg.sender?._id === currentUserId
          ? "outgoing"
          : "incoming"
      );

    } else {

      appendMessage(
        msg.text,
        msg.sender?._id === currentUserId
          ? "outgoing"
          : "incoming"
      );

    }

  });

}

async function sendMessage() {

  if (sendMessage.loading)
    return;

  sendMessage.loading = true;

  const input =
    document.getElementById(
      "messageInput"
    );

  const text =
    input.value
      .replace(/\s+/g, " ")
      .trim();

  if (
    !text ||
    !activeChatUser
  ) {

    sendMessage.loading = false;

    return;

  }

  try {

    await apiPost(`/messages/${activeChatUser}`, { text });
    appendMessage(text, "outgoing");
    const preview = document.querySelector(`[data-userid="${activeChatUser}"] .conv-message`);
    if (preview) {
      preview.innerText = text;
    }

    const item =
      document.querySelector(
        `[data-userid="${activeChatUser}"]`
      );

    if (item) {

      const parent =
        item.parentElement;

      parent.prepend(item);

    }

    input.value = "";

  } catch (err) {

    console.error(
      "Send error:",
      err
    );

  } finally {

    sendMessage.loading = false;

  }

}

socket.on("receiveMessage", msg => {
  const senderId = msg.sender?._id || msg.sender;
  const preview = document.querySelector(
    `[data-userid="${senderId}"] .conv-message`
  );

  if (preview) {
    preview.innerText = msg.image ? "📷 Image" : msg.text;
  }
  const item = document.querySelector(`[data-userid="${senderId}"]`);

  if (item) {
    const parent = item.parentElement;
    parent.prepend(item);
  }

  if (
    senderId === activeChatUser
  ) {

    if (msg.image) {

      appendImageMessage(
        msg.image,
        "incoming"
      );

    } else {

      appendMessage(
        msg.text,
        "incoming"
      );

    }

  } else {

    unreadCounts[senderId] =
      (unreadCounts[senderId] || 0)
      + 1;

    updateBadge(senderId);

  }

}
);

function escapeHTML(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;

}

function appendMessage(text, type) {
  const container = document.getElementById("messages");
  const placeholder = container.querySelector(".chat-placeholder");
  if (placeholder) placeholder.remove();
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.innerHTML = `
    <div class="message-content">
      ${escapeHTML(text)}
    </div>
    <div class="message-time">
      ${new Date().toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  )}
    </div>
  `;

  container.appendChild(msg);

  requestAnimationFrame(() => {

    container.scrollTop = container.scrollHeight;

  });

}

function appendImageMessage(image, type) {

  console.log("IMAGE RECEIVED:", image);

  if (!image) {
    console.error("Image path is undefined");
    return;
  }
  const container = document.getElementById("messages");
  const placeholder = container.querySelector(".chat-placeholder");
  if (placeholder)
    placeholder.remove();

  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.innerHTML = `
    <img loading='lazy' src="${image && image.startsWith("http")
      ? image
      : API + image
    }"
      class="chat-image"
      alt="Image">

    <div class="message-time">

      ${new Date().toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}

    </div>
  `;

  container.appendChild(msg);
  msg.querySelector("img").onclick = () => {
    const imageUrl = image && image.startsWith("http") ? image : API + image;
    const newTab = window.open(imageUrl, "_blank", "noopener,noreferrer");

    if (newTab) {
      newTab.opener = null;
    }

  };

  requestAnimationFrame(() => {

    container.scrollTop =
      container.scrollHeight;

  });
}

document.getElementById("imageUpload").addEventListener("change", async function () {

  if (this.uploading)
    return;

  this.uploading = true;
  const file =
    this.files[0];

  if (
    !file ||
    !activeChatUser
  ) {

    this.uploading = false;

    return;

  }

  if (
    !file.type.startsWith("image/")
  ) {
    alert(
      "Only image files allowed"
    );

    this.uploading = false;

    return;

  }

  if (
    file.size > 5 * 1024 * 1024
  ) {

    alert(
      "Image must be under 5MB"
    );

    this.uploading = false;

    return;

  }



  const formData = new FormData();

  formData.append("image", file);

  try {

    const res = await fetch(`${API}/messages/${activeChatUser}/image`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")
            }`
        },

        body: formData
      }
    );

    const data = await res.json();
    console.log("UPLOAD RESPONSE:", data);

    if (!res.ok) {

      throw new Error(
        data.message ||
        "Image upload failed"
      );

    }

    appendImageMessage(data.image, "outgoing");

    const preview = document.querySelector(`[data-userid="${activeChatUser}"] .conv-message`);

    if (preview) {
      preview.innerText = "📷 Image";
    }

    const item = document.querySelector(`[data-userid="${activeChatUser}"]`);

    if (item) {

      const parent = item.parentElement;

      parent.prepend(item);

    }

    this.value = "";

  } catch (err) {

    console.error(
      "Image upload error:",
      err
    );

  } finally {

    this.uploading = false;

  }

}
);


socket.on("connect", () => {
  console.log("Socket connected");
}
);

socket.on("disconnect", () => {
  console.log("Socket disconnected"
  );

}
);

document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("messageInput").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    sendMessage();
  }

}
);

function updateBadge(userId) {

  const badge = document.getElementById(
    `badge-${userId}`
  );

  if (!badge) return;

  badge.innerText =
    unreadCounts[userId];

  badge.style.display =
    "flex";

}

function clearUnread(userId) {

  unreadCounts[userId] = 0;

  const badge =
    document.getElementById(
      `badge-${userId}`
    );

  if (badge) {
    badge.style.display =
      "none";
  }

}

socket.on(
  "onlineUsers",
  users => {

    document
      .querySelectorAll(
        ".conversation-item"
      )
      .forEach(item => {

        const id =
          item.dataset.userid;

        const dot = document.getElementById(
          `online-${id}`
        );

        if (!dot) return;

        dot.style.background =
          users.includes(id)
            ? "#22c55e"
            : "#d1d5db";

      });

  }
);

let typingTimeout;

const input =
  document.getElementById(
    "messageInput"
  );

let lastTypingEmit = 0;

input.addEventListener(
  "input",
  () => {

    if (!activeChatUser)
      return;

    const now = Date.now();

    if (now - lastTypingEmit > 500) {

      socket.emit(
        "typing",
        {
          to: activeChatUser
        }
      );

      lastTypingEmit = now;

    }

    clearTimeout(
      typingTimeout
    );

    typingTimeout =
      setTimeout(() => {

        socket.emit(
          "stopTyping",
          {
            to: activeChatUser
          }
        );

      }, 1500);

  }
);

socket.on("userTyping",
  ({ from }) => {

    if (
      from === activeChatUser
    ) {
      document.getElementById("typingIndicator").style.display = "flex";
    }

  }
);

socket.on("userStoppedTyping", () => {
  document.getElementById("typingIndicator").style.display = "none";
}
);

document.getElementById("searchInput").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  document.querySelectorAll(".conversation-item").forEach(item => {
    const name = item.querySelector(".conv-name").innerText.toLowerCase();
    item.style.display = name.includes(value) ? "flex" : "none";
  });

}
);