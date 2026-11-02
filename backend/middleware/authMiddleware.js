
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                message: "Not authorized. Access token missing."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        if (decoded.type !== "access" || !decoded.id) {
            return res.status(401).json({
                message: "Invalid access token."
            });
        }

        const user = await User.findById(decoded.id)
            .select("-password -refreshToken -twoFASecret");

        if (!user || !user.isVerified) {
            return res.status(401).json({
                message: "User not found or email not verified."
            });
        }

        req.user = user;
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Access token expired."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Invalid access token."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            message: "Authentication failed."
        });
    }
};


const authorize = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Not authenticated."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied."
            });
        }

        next();
    };
};


const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        if (decoded.type !== "access" || !decoded.id) {
            return next();
        }

        const user = await User.findById(decoded.id)
            .select("-password -refreshToken -twoFASecret");

        if (user && user.isVerified) {
            req.user = user;
        }

        next();

    } catch (error) {
        next();
    }
};


module.exports = {
    protect,
    authorize,
    optionalAuth
};
