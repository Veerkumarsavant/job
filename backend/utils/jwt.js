// utils/jwt.js
const jwt = require("jsonwebtoken");
function generateAccessToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "15m"
  });
}
function generateRefreshToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}
module.exports = {
  generateAccessToken,
  generateRefreshToken
};