let currentPage = 1;
const limit = 10;
let selectedUsers = new Set();
let searchTimeout;
let isLoading = false;

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();

  document.getElementById("searchInput")
    .addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadUsers();
      }, 400);
    });

  document.getElementById("roleFilter")
    .addEventListener("change", () => {
      currentPage = 1;
      loadUsers();
    });


  document.getElementById("selectAll").addEventListener("change", toggleSelectAll);
  document.getElementById("bulkDeleteBtn").addEventListener("click", bulkDelete);
  document.getElementById("prevPage").addEventListener("click", () => changePage(-1));
  document.getElementById("nextPage").addEventListener("click", () => changePage(1));
});


async function loadUsers() {
  try {
    const search = document.getElementById("searchInput").value;
    const role = document.getElementById("roleFilter").value;
    const query = new URLSearchParams({
      page: currentPage,
      limit,
      search,
      role
    });

    const res = await api(`/admin/users?${query}`, {method: "GET"});

    renderUsers(res.users || []);
    updatePagination(res.total || 0);
    document.getElementById("selectAll").checked = false;
  
}
catch{}


function renderUsers(users) {
  const tbody = document.getElementById("userList");
  tbody.innerHTML = "";

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:20px;">
          🔍 No users found
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input type="checkbox" data-id="${user._id}">
      </td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>
        <span class="status-badge ${user.status}">
          ${user.status}
        </span>
      </td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn-secondary toggleStatus">
          ${user.status === "active" ? "Suspend" : "Activate"}
        </button>
      </td>
    `;

    tr.querySelector("input")
      .addEventListener("change", e =>
        toggleSelection(user._id, e.target.checked)
      );

    tr.querySelector(".toggleStatus")
      .addEventListener("click", () =>
        toggleUserStatus(user)
      );

    tbody.appendChild(tr);
  });
}



function toggleSelection(id, checked) {
  if (checked) selectedUsers.add(id);
  else selectedUsers.delete(id);

  document.getElementById("bulkDeleteBtn").classList.toggle("hidden", selectedUsers.size === 0);

}

function toggleSelectAll(e) {
  document.querySelectorAll("#userList input")
    .forEach(cb => {
      cb.checked = e.target.checked;
      toggleSelection(cb.dataset.id, cb.checked);
    });
}


async function bulkDelete() {
  if (!confirm("Delete selected users?")) return;
  if (isLoading) return;

  try {
    isLoading = true;

    await api("/admin/users/bulk-delete", {
  method: "POST",
  body: JSON.stringify({
    ids: [...selectedUsers]
  })
});


    selectedUsers.clear();
    loadUsers();

  } catch (err) {
    console.error(err);
    alert("Delete failed");
  } finally {
    isLoading = false;
  }
}


async function toggleUserStatus(user) {
  if (isLoading) return;

  try {
    isLoading = true;

    const newStatus = user.status === "active" ? "suspended" : "active";

    await api(`/admin/users/${user._id}`, {
  method: "PUT",
  body: JSON.stringify({
    status: newStatus
  })
});


    loadUsers();

  } catch (err) {
    console.error(err);
    alert("Update failed");
  } finally {
    isLoading = false;
  }
}

function changePage(step) {
  selectedUsers.clear();

  currentPage += step;
  if (currentPage < 1) currentPage = 1;

  loadUsers();
}

function updatePagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${totalPages}`;
}

}