const API_BASE = "http://localhost:5000/api/auth";
const API_URL = `${API_BASE}/forgot-password`;
const form = document.getElementById("forgotForm");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const emailToggle = document.getElementById("emailToggle");
const smsToggle = document.getElementById("smsToggle");
const emailSection = document.getElementById("emailSection");
const smsSection = document.getElementById("smsSection");
const submitBtn = document.getElementById("submitBtn");
const messageEl = document.getElementById("message");
const successBox = document.getElementById("successBox");
const resendTimer = document.getElementById("resendTimer");

let mode = "email";
let cooldown = 0;
let timerInterval = null;
console.log("forgot-password.js loaded");
emailToggle.addEventListener("click", () => {
  mode = "email";
  emailSection.style.display = "block";
  smsSection.style.display = "none";
  emailToggle.classList.add("active");
  smsToggle.classList.remove("active");
  emailInput.required = true;
  phoneInput.required = false;
  clearMessages();
});
smsToggle.addEventListener("click", () => {
  mode = "sms";
  emailSection.style.display = "none";
  smsSection.style.display = "block";

  smsToggle.classList.add("active");
  emailToggle.classList.remove("active");

  phoneInput.required = true;
  emailInput.required = false;

  clearMessages();
});

function validate() {
  if (mode === "email") {
    const email = emailInput.value.trim();
    if (!email) return "Email is required";
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return "Invalid email";
    return null;
  }
  if (mode === "sms") {
    const phone = phoneInput.value.trim();
    if (!phone) return "Phone number is required";
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(phone)) return "Invalid phone number";
    return null;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitBtn.disabled || cooldown > 0) return;
  console.log("Form intercepted");
  clearMessages();
  const error = validate();
  if (error) {
    showMessage(error);
    return;
  }
  const payload =
    mode === "email"
      ? { email: emailInput.value.trim() }
      : { phone: phoneInput.value.trim() };

  try {
    toggleLoading(true);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    showSuccess();
    startCooldown(60);
  } catch (err) {
    console.error(err);
    showMessage("Something went wrong. Try again.");
  } finally {
    toggleLoading(false);
  }
});
function toggleLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.innerText = isLoading
    ? "Sending..."
    : "Send Reset Instructions";
}
function showSuccess() {
  successBox.style.display = "block";
  showMessage(
    "If an account exists, reset instructions have been sent.",
    "success"
  );
  setTimeout(() => {
    successBox.style.display = "none";
  }, 4000);
}
function showMessage(text, type = "error") {
  messageEl.innerText = text;
  messageEl.style.color =
    type === "success" ? "#16a34a" : "#dc2626";
}
function clearMessages() {
  messageEl.innerText = "";
}
function startCooldown(seconds) {
  cooldown = seconds;
  submitBtn.disabled = true;
  resendTimer.style.display = "block";
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    resendTimer.innerText = `Resend in ${cooldown}s`;
    cooldown--;
    if (cooldown < 0) {
      clearInterval(timerInterval);
      resendTimer.innerText = "";
      submitBtn.disabled = false;
      cooldown = 0;
    }
  }, 1000);
}