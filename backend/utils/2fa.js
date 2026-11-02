const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const generate2FA = async (user) => {
  const secret = speakeasy.generateSecret({
    name: `ProConnect (${user.email})`,
    issuer: "ProConnect"
  });

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
    qr
  };
};

const verify2FA = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1
  });
};

module.exports = {
  generate2FA,
  verify2FA
};