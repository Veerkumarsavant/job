// js/core/theme.js

const themeToggle = document.getElementById("themeToggle");

function applySavedTheme() {
  const saved = localStorage.getItem("recruiterTheme");
  if (saved === "dark") {
    document.body.classList.add("dark-mode");
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  const mode = document.body.classList.contains("dark-mode")
    ? "dark"
    : "light";

  localStorage.setItem("recruiterTheme", mode);
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

applySavedTheme();