const API = "http://localhost:5000/api/auth";
const form = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const otpInput = document.getElementById("otp");
const message = document.getElementById("message");
const successBox = document.getElementById("successBox");
const btn = document.getElementById("submitBtn");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
  message.innerText = "Invalid or missing reset token";
  btn.disabled = true;
}
let strength = 0;
passwordInput.addEventListener("input", () => {
  const pwd = passwordInput.value;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*]/.test(pwd)) score++;
  strength = (score / 5) * 100;
  strengthBar.style.width = strength + "%";
  if (strength <= 40) {
    strengthBar.className = "weak";
    strengthText.innerText = "Weak";
  } else if (strength <= 80) {
    strengthBar.className = "medium";
    strengthText.innerText = "Medium";
  } else {
    strengthBar.className = "strong";
    strengthText.innerText = "Strong";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = passwordInput.value.trim();
  const confirm = confirmInput.value.trim();
  const otp = otpInput.value.trim();
  message.innerText = "";
  if (strength < 60) {
    return message.innerText = "Password is too weak";
  }
  if (password !== confirm) {
    return message.innerText = "Passwords do not match";
  }
  try {
    btn.disabled = true;
    btn.innerText = "Resetting...";
    const res = await fetch(`${API}/reset-password/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Reset failed");
    successBox.classList.remove("hidden");
    setTimeout(() => {
      window.location.href = "/auth/login.html";
    }, 1500);
  } catch (err) {
    message.innerText = err.message;
    btn.disabled = false;
  } finally {
    btn.innerText = "Reset Password";
  }
});