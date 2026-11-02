"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const API = "/api";

    const inputs = [
        ...document.querySelectorAll(".otp-input")
    ];

    const verifyForm = document.getElementById("verifyForm");
    const verifyBtn = document.getElementById("verifyBtn");
    const resendBtn = document.getElementById("resendBtn");
    const timerEl = document.getElementById("timer");
    const msg = document.getElementById("msg");
    const emailText = document.getElementById("emailText");

    const params = new URLSearchParams(location.search);

    const email =
        params.get("email") ||
        sessionStorage.getItem("pendingVerificationEmail");

    let timeLeft = 30;
    let timer = null;

    let isVerifying = false;
    let isResending = false;


    if (
        inputs.length !== 6 ||
        !verifyForm ||
        !verifyBtn ||
        !resendBtn ||
        !timerEl ||
        !msg
    ) {
        console.error("OTP HTML elements are missing.");
        return;
    }

    if (emailText) {
        emailText.textContent = email || "";
    }

    if (!email) {

        showMessage(
            "Email missing. Please register again.",
            "error"
        );

        verifyBtn.disabled = true;
        resendBtn.disabled = true;

        return;
    }

    inputs[0].focus();


    function showMessage(text, type) {
        msg.textContent = text;
        msg.className = type;
    }



    function getOTP() {
        return inputs.map(input => input.value).join("");
    }



    inputs.forEach((input, index) => {

        input.addEventListener("input", () => {

            input.value = input.value
                .replace(/\D/g, "")
                .slice(-1);

            if (input.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }

        });


        input.addEventListener("keydown", event => {

            if (
                event.key === "Backspace" &&
                !input.value &&
                index > 0
            ) {
                inputs[index - 1].focus();
            }

            if (event.key === "ArrowLeft" && index > 0) {
                inputs[index - 1].focus();
            }

            if (
                event.key === "ArrowRight" &&
                index < inputs.length - 1
            ) {
                inputs[index + 1].focus();
            }

        });


        input.addEventListener("paste", event => {

            event.preventDefault();

            const pasted = event.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            if (!pasted) return;

            inputs.forEach((box, i) => {
                box.value = pasted[i] || "";
            });

            inputs[Math.min(pasted.length, 5)].focus();

        });

    });


    async function readResponse(response) {

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message || `Request failed (${response.status})`
            );
        }

        if (!data) {
            throw new Error("Invalid server response.");
        }

        return data;
    }


    function redirectByRole(user) {

        const role = String(user?.role || "user")
            .toLowerCase()
            .trim();

        const routes = {
            admin: "/admin/dashboard.html",
            recruiter: "/recruiter/dashboard.html",
            user: "/pages/feed.html"
        };

        location.replace(routes[role] || routes.user);
    }


    verifyForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (isVerifying) return;

        const otp = getOTP();

        if (!/^\d{6}$/.test(otp)) {

            showMessage(
                "Enter the complete six-digit OTP.",
                "error"
            );

            return;
        }

        isVerifying = true;

        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";

        try {

            const response = await fetch(
                `${API}/auth/verify-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email,
                        otp
                    })
                }
            );

            const data = await readResponse(response);

            if (data.accessToken) {
                localStorage.setItem(
                    "accessToken",
                    data.accessToken
                );
            }

            if (data.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            sessionStorage.removeItem(
                "pendingVerificationEmail"
            );

            showMessage(
                "Email verified successfully!",
                "success"
            );

            setTimeout(() => {

                if (data.accessToken && data.user) {
                    redirectByRole(data.user);
                } else {
                    location.replace("/auth/login.html");
                }

            }, 1000);

        } catch (error) {

            console.error("OTP verification error:", error);

            showMessage(error.message, "error");

            isVerifying = false;

            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verify Email";

        }

    });


    function startResendTimer() {

        clearInterval(timer);

        timeLeft = 30;

        resendBtn.disabled = true;

        timerEl.textContent = `Resend in ${timeLeft}s`;

        timer = setInterval(() => {

            timeLeft--;

            if (timeLeft <= 0) {

                clearInterval(timer);
                timer = null;

                resendBtn.disabled = false;

                timerEl.textContent =
                    "You can resend OTP";

                return;
            }

            timerEl.textContent =
                `Resend in ${timeLeft}s`;

        }, 1000);

    }




    resendBtn.addEventListener("click", async () => {

        if (isResending) return;

        isResending = true;

        resendBtn.disabled = true;
        resendBtn.textContent = "Sending...";

        try {

            const response = await fetch(
                `${API}/auth/resend-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({ email })
                }
            );

            const data = await readResponse(response);

            showMessage(
                data.message || "New OTP sent successfully.",
                "success"
            );

            startResendTimer();

        } catch (error) {

            console.error("Resend OTP error:", error);

            showMessage(error.message, "error");

            resendBtn.disabled = false;

            timerEl.textContent =
                "You can try resending OTP.";

        } finally {

            isResending = false;
            resendBtn.textContent = "Resend OTP";

        }

    });



    startResendTimer();

    console.log("✅ ProConnect OTP verification initialized");

});