const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const { loginLimiter } = require("../middleware/rateLimiter") || {};
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const User = require("../models/User");
const crypto = require("crypto");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");


function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

async function issueTokens(user, res) {

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = hashToken(refreshToken);

    await user.save();
e
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api/auth"
    });

    return accessToken;
}

router.get("/admin/dashboard",protect,allowRoles("admin"),
  (req, res) => {
    res.json({ message: "Admin dashboard" });
  }
);
router.get("/recruiter",protect,allowRoles("recruiter"),
  (req, res) => {
    res.json({ message: "Recruiter dashboard" });
  }
);

router.get("/google",passport.authenticate("google", {scope: ["profile", "email"]}));

router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login.html"
  }),
  (req, res) => {
    if (!req.user) {
      return res.redirect("/auth/login.html");
    }
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.redirect(`/auth/success.html?token=${token}`);
  }
);

router.post("/refresh", async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            return res.status(401).json({
                message: "Refresh token missing"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );

        if (decoded.type !== "refresh" || !decoded.id) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const user = await User.findById(decoded.id);

        if (!user || !user.isVerified || !user.refreshToken) {
            return res.status(401).json({
                message: "Refresh token revoked"
            });
        }

        const incomingHash = hashToken(token);

        if (incomingHash !== user.refreshToken) {
            return res.status(401).json({
                message: "Refresh token mismatch"
            });
        }

        // Rotate both tokens
        const accessToken = await issueTokens(user, res);

        return res.status(200).json({
            accessToken
        });

    } catch (err) {
        console.error("Refresh error:", err.message);

        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/register", authController.register);
router.post("/login",loginLimiter || ((req, res, next) => next()),authController.login);
router.post("/verify-otp", authController.verifyEmailOTP);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-otp", authController.resendOTP);
router.post("/2fa/verify-login", authController.verify2FALogin);
router.post("/logout", async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (token) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_REFRESH_SECRET
                );

                await User.findByIdAndUpdate(decoded.id, {
                    $unset: {
                        refreshToken: 1
                    }
                });

            } catch (err) {
                // Invalid tokens cannot be used to authenticate.
            }
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/api/auth"
        });

        return res.json({
            message: "Logged out successfully"
        });

    } catch (err) {
        console.error("Logout error:", err.message);

        return res.status(500).json({
            message: "Logout failed"
        });
    }
});
module.exports = router;