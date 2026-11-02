const form = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const otpInput = document.getElementById("otp");
const messageEl = document.getElementById("message");
const successBox = document.getElementById("successBox");
const submitBtn = document.getElementById("submitBtn");
const strengthBar = document.getElementById("strengthBar");
const params = new URLSearchParams(window.location.search);
const token = params.get("token");
if (!token) {
 showMessage("Invalid reset link.");
 submitBtn.disabled = true;
}

passwordInput.addEventListener("input", () => {
 const password = passwordInput.value;
 let strength = 0;
 if (password.length >= 8) strength++;
 if (/[A-Z]/.test(password)) strength++;
 if (/[0-9]/.test(password)) strength++;
 if (/[^A-Za-z0-9]/.test(password)) strength++;

 const width = (strength / 4) * 100;
 strengthBar.style.width = width + "%";
 if (strength <= 1) {strengthBar.style.background = "#e0245e";}
 else if (strength === 2) {strengthBar.style.background = "#ff9800";}
 else if (strength === 3) {strengthBar.style.background = "#ffc107";}
 else { strengthBar.style.background = "#1dbf73";}
});


form.addEventListener("submit", async (e) => {
 e.preventDefault();
 const password = passwordInput.value.trim();
 const confirmPassword = confirmInput.value.trim();
 const otp = otpInput.value.trim();
 if (!password || !confirmPassword) {
  showMessage("Please fill all required fields.");
  return;
 }

 if (password.length < 8) {showMessage("Password must be at least 8 characters.");return;}
 if (password !== confirmPassword) {showMessage("Passwords do not match.");return;}

 submitBtn.disabled = true;
 submitBtn.innerText = "Resetting...";

 try {
  const res = await fetch(`${API}/auth/reset-password`, {
   method: "POST",
   headers: {"Content-Type": "application/json"},
   body: JSON.stringify({token,password})
  });

  const data = await res.json();
  if (!res.ok) {throw new Error(data.message || "Reset failed");}
  successBox.style.display = "block";
  showMessage("Password reset successful", "success");
  setTimeout(() => {window.location.href = "/auth/login.html";}, 2500);
 } catch (err) {
  showMessage(err.message || "Network error");
 }

 submitBtn.disabled = false;
 submitBtn.innerText = "Reset Password";

});

function showMessage(text, type = "error") {
 messageEl.innerText = text;
 messageEl.style.color =
  type === "success"
   ? "#16a34a"
   : "#dc2626";
}