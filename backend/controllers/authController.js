const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const generateResetToken = require("../utils/generateResetToken");
const User = require("../models/User");
const { sendOTPEmail,
  sendPasswordResetEmail
} = require("../services/emailService");

const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/generateToken");
const { verify2FA } = require("../utils/2fa");

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

async function issueTokens(user, res) {

    // Generate access token
    const accessToken = generateAccessToken(user);

    // Generate refresh token
    const refreshToken = generateRefreshToken(user);

    // Store hashed refresh token in database
    user.refreshToken = hashToken(refreshToken);

    await user.save();

    // Set HTTP-only refresh token cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api/auth"
    });

    return accessToken;
}

const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required."
            });
        }

        const strongPassword =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!strongPassword) {
            return res.status(400).json({
                message: "Password must contain uppercase, lowercase, number, special character and at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const allowedRoles = ["user", "recruiter"];

        const selectedRole = role || "user";

        if (!allowedRoles.includes(selectedRole)) {
            return res.status(400).json({
                message: "Invalid account type."
            });
        }

        let user = await User.findOne({
            email: normalizedEmail
        });

        if (user && user.isVerified) {
            return res.status(409).json({
                message: "Email already exists. Please log in."
            });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpExpires = new Date(
            Date.now() + 10 * 60 * 1000
        );

        try {
            if (user) {
                user.name = name;
                user.password = password;
                user.role = selectedRole;
                user.emailOTP = otp;
                user.otpExpires = otpExpires;

                await user.save();

            } else {
                user = await User.create({
                    name,
                    email: normalizedEmail,
                    password,
                    role: selectedRole,
                    emailOTP: otp,
                    otpExpires,
                    isVerified: false
                });
            }

        } catch (dbError) {
            console.error("REGISTRATION DATABASE ERROR:", dbError);

            return res.status(500).json({
                message: "Unable to create account. Please check database validation."
            });
        }

        try {
            await sendOTPEmail(normalizedEmail, otp);

        } catch (emailError) {
            console.error("REGISTRATION EMAIL ERROR:", emailError);

            return res.status(503).json({
                message: "Account saved, but OTP email delivery failed. Please try resending OTP."
            });
        }

        return res.status(201).json({
            message: "Registration successful. Check your email for the OTP."
        });

    } catch (err) {
        console.error("REGISTRATION CONTROLLER ERROR:", err);

        return res.status(500).json({
            message: "Registration failed due to a server error."
        });
    }
};

const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedOTP = String(otp ?? "").trim();

        if (!normalizedEmail || !normalizedOTP) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }

        const user = await User.findOne({
            email: normalizedEmail,
            emailOTP: normalizedOTP,
            otpExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired OTP."
            });
        }

        user.isVerified = true;
        user.emailOTP = undefined;
        user.otpExpires = undefined;

        await user.save();

        const accessToken = await issueTokens(user, res);

        return res.status(200).json({
            message: "Email verified successfully.",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isVerified
            }
        });

    } catch (err) {
        console.error("Email verification error:", err.message);

        return res.status(500).json({
            message: "Email verification failed."
        });
    }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified"
      });
    }
    const otp = crypto.randomInt(100000, 1000000).toString();
    user.emailOTP = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTPEmail(normalizedEmail, otp);
    const response = {
      message: "OTP resent successfully"
    };
    if (process.env.NODE_ENV === "development") {
      response.otpFallback = otp;
    }
    res.json(response);
  } catch (err) {
    console.error("❌ Resend OTP error:", err.message);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found. Please register first."
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: "Please verify your email first."
            });
        }


        const isPasswordValid = await bcrypt.compare(
    password,
    user.password
);

if (!isPasswordValid) {
    return res.status(401).json({
        message: "Invalid email or password."
    });
}

        if (user.is2FAEnabled) {
            return res.json({
                require2FA: true,
                userId: user._id
            });
        }

        const accessToken = await issueTokens(user, res);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isVerified
            }
        });

    } catch (err) {
        console.error("Login error:", err.message);

        return res.status(500).json({
            message: "Login failed. Please try again."
        });
    }
};

const verify2FALogin = async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({
                message: "User ID and authentication code are required."
            });
        }

        const user = await User.findById(userId);

        if (
            !user ||
            !user.isVerified ||
            !user.is2FAEnabled ||
            !user.twoFASecret
        ) {
            return res.status(400).json({
                message: "Invalid 2FA login request."
            });
        }

        const valid = verify2FA(user.twoFASecret, token);

        if (!valid) {
            return res.status(401).json({
                message: "Invalid authentication code."
            });
        }

        const accessToken = generateAccessToken(user);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isVerified
            }
        });

    } catch (err) {
        console.error("2FA login error:", err.message);

        return res.status(500).json({
            message: "2FA verification failed."
        });
    }
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const genericResponse = {
      message: "If an account exists, email sent"
    };
    if (!email) {
      return res.json(genericResponse);
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json(genericResponse);
    }
    const token = generateResetToken(user._id);
    const link = `${process.env.CLIENT_URL}/auth/reset-password.html?token=${token}`;
    await sendPasswordResetEmail(user.email, link);
    return res.json(genericResponse);
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    return res.json({
      message: "If an account exists, email sent"
    });
  }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: "Token and password are required."
            });
        }

        const strongPassword =
            typeof password === "string" &&
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!strongPassword) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters, uppercase, lowercase, number and special character."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.purpose !== "password-reset") {
            return res.status(400).json({
                message: "Invalid password reset token."
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(400).json({
                message: "User not found."
            });
        }

        user.password = password;
user.refreshToken = undefined;

await user.save();

        return res.status(200).json({
            message: "Password reset successful."
        });

    } catch (err) {
        console.error("Password reset error:", err.message);

        return res.status(400).json({
            message: "Invalid or expired password reset token."
        });
    }
};


module.exports = {
  register,
  verifyEmailOTP,
  resendOTP,
  login,
  verify2FALogin,
  forgotPassword,
  resetPassword
};
