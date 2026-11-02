
//const API_BASE_URL =window.location.hostname === "localhost" ||window.location.hostname === "127.0.0.1"? "http://localhost:5000": window.location.origin;
(async () => {

if (window.__AUTO_LOGIN_DONE__) return;
window.__AUTO_LOGIN_DONE__ = true;

if (!window.location.pathname.includes("login.html")) return;

const token = localStorage.getItem("accessToken");

if (!token) return;

try {
    const response = await fetch(`${window.API}/auth/me`, {
    method: "GET",
    headers: window.authHeaders(),
    credentials: "include"
});

if (!response.ok) {
    if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
    }
    return;
}

const data = await response.json();
    if (!data) return;
    const user = data.user || data;
    if (!user) return;
    localStorage.setItem("user", JSON.stringify(user));
    const role = (user.role || "").toLowerCase();
    console.log("AUTO LOGIN ROLE:", role);
    if (role === "admin") {
        window.location.replace("/admin/dashboard.html");
    } else if (role === "recruiter") {
        window.location.replace("/recruiter/dashboard.html");
    } else {
        window.location.replace("/pages/feed.html");
    }
} catch (err) {
    console.warn("Auto-login failed:", err);
}
})();


function googleLogin() {
window.location.href = `${window.API}/auth/google`;
}


const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const btn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const spinner = document.getElementById("spinner");
const successOverlay = document.getElementById("successOverlay");

document.getElementById("togglePassword")?.addEventListener("click", () => {
passwordInput.type =passwordInput.type === "password" ? "text" : "password";
});


form?.addEventListener("submit", async (e) => {
e.preventDefault();
const email = emailInput.value.trim();
const password = passwordInput.value.trim();

errorMsg.innerText = "";

if (!email || !password) {
    errorMsg.innerText = "Email and password required";
    return;
}

btn.disabled = true;
btnText.innerText = "Logging in...";
spinner?.classList.remove("hidden");
try {
    const res = await fetch(`${window.API}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            email,
            password
        })
    });


    const responseText = await res.text();
    let data = {};
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(
            "Backend returned an invalid JSON response."
        );

    }


    if (!res.ok) {
        const message = data.message || "Login failed.";
        if (
            res.status === 403 &&
            message.toLowerCase().includes("verify")
        ) {

            sessionStorage.setItem(
                "pendingVerificationEmail",
                email
            );

            window.location.replace(
                `/pages/verify-otp.html?email=${encodeURIComponent(email)}`
            );

            return;

        }

        throw new Error(message);

    }


    const user = data.user;

    if (!user || !data.accessToken) {

        throw new Error(
            "Access token or user details are missing."
        );

    }

    const isEmailVerified =
        user.isEmailVerified === true ||
        user.emailVerified === true ||
        user.isVerified === true;

    if (!isEmailVerified) {

        sessionStorage.setItem(
            "pendingVerificationEmail",
            email
        );

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        window.location.replace(
            `/pages/verify-otp.html?email=${encodeURIComponent(email)}`
        );

        return;

    }


    localStorage.setItem(
        "accessToken",
        data.accessToken
    );

    localStorage.setItem(
        "user",
        JSON.stringify(user)
    );


    document
        .querySelector(".auth-wrapper")
        ?.classList.add("hidden");

    successOverlay?.classList.remove("hidden");

    setTimeout(() => {

        const role = (user.role || "user").toString().toLowerCase().trim();

        console.log("LOGIN SUCCESS");
        console.log("USER ROLE:", role);

        if (role === "admin") {

            window.location.replace(
                "/admin/dashboard.html"
            );

        } else if (role === "recruiter") {

            window.location.replace(
                "/recruiter/dashboard.html"
            );

        } else {

            window.location.replace(
                "/pages/feed.html"
            );

        }

    }, 800);


} catch (err) {
    console.error("Login error:", err);
    errorMsg.innerText = err.message;
} finally {

    btn.disabled = false;
    btnText.innerText = "Login";
    spinner?.classList.add("hidden");

}


});


console.log(
"LOGIN SCRIPT RUNNING ON:",
window.location.pathname
);

console.log("BACKEND API:", window.API);