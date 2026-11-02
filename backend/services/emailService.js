const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY;

let resend = null;

if (resendApiKey) {
    resend = new Resend(resendApiKey);
    console.log("✅ Resend email service initialized");
} else {
    console.warn("⚠️ Resend disabled: API key missing");
}


exports.sendEmail = async ({ to, subject, html }) => {
    try {
        if (!resend) {
            throw new Error("RESEND_API_KEY is missing");
        }

        if (!process.env.EMAIL_FROM) {
            throw new Error("EMAIL_FROM is missing");
        }

        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        });

        if (result.error) {
            console.error("RESEND ERROR:", result.error);

            throw new Error(
                result.error.message || "Email delivery failed"
            );
        }

        console.log("✅ Email accepted:", result.data?.id);

        return result.data;

    } catch (error) {
        console.error("❌ EMAIL SERVICE ERROR:", error.message);
        throw error;
    }
};


exports.sendVerificationEmail = async (user) => {

    const link =
        `${process.env.CLIENT_URL}/auth/verify.html?token=${encodeURIComponent(user.verificationToken)}`;

    await exports.sendEmail({
        to: user.email,
        subject: "Verify Your ProConnect Account",
        html: `
            <div style="font-family:Arial;padding:20px">
                <h2>Welcome to ProConnect</h2>
                <p>Please verify your email address:</p>

                <a href="${link}"
                   style="display:inline-block;padding:10px 20px;
                   background:#2ecc71;color:white;
                   text-decoration:none;border-radius:6px;">
                    Verify Email
                </a>

                <p>If you didn't create this account, ignore this email.</p>
            </div>
        `
    });
};


exports.sendOTPEmail = async (email, otp) => {

    await exports.sendEmail({
        to: email,
        subject: "Your ProConnect OTP Code",
        html: `
            <div style="font-family:Arial;padding:20px">
                <h3>Your OTP Code</h3>

                <h1 style="letter-spacing:6px;color:#0a66c2;font-size:32px">
                    ${otp}
                </h1>

                <p>This OTP is valid for 10 minutes.</p>
            </div>
        `
    });
};

exports.sendPasswordResetEmail = async (email, link) => {

    await exports.sendEmail({
        to: email,
        subject: "Reset Your Password",
        html: `
            <div style="font-family:Arial;padding:20px">
                <h2>Password Reset</h2>

                <p>Click below to reset your password:</p>

                <a href="${link}"
                   style="background:#0073b1;color:white;
                   padding:10px 15px;text-decoration:none;
                   border-radius:5px;display:inline-block;">
                    Reset Password
                </a>

                <p>This link expires in 10 minutes.</p>
            </div>
        `
    });
};


exports.sendInterviewEmail = async (to, name, jobTitle, date) => {

    await exports.sendEmail({
        to,
        subject: "Interview Scheduled 🎉",
        html: `
            <div style="font-family:Arial;padding:20px">
                <h2>Hello ${name || "Candidate"}</h2>

                <p>Your interview has been scheduled.</p>

                <p><b>Job:</b> ${jobTitle}</p>

                <p><b>Date:</b> ${new Date(date).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "short"
                })}</p>

                <br>
                <p>Good luck! 🚀</p>
            </div>
        `
    });
};

