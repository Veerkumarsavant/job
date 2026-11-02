const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    msg: "Too many login attempts. Try again later."
  }
});

module.exports = {
  apiLimiter,
  loginLimiter
};