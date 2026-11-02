// js/core/auth-guard.js

(function () {

  const token = localStorage.getItem("accessToken");

  // No token → redirect
  if (!token) {
    return redirect();
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Expired token
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      return redirect();
    }

    // Role check
    if (payload.role !== "recruiter") {
      return redirect();
    }

  } catch (err) {
    console.error("Auth guard error:", err);
    localStorage.clear();
    return redirect();
  }

  function redirect() {
    // ✅ ALWAYS absolute path
    window.location.href = "/auth/login.html";
  }

})();