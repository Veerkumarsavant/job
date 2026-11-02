const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to, message) => {
  try {
    if (!to || !message) {
      throw new Error("Phone and message are required");
    }

    if (!to.startsWith("+")) {
      throw new Error("Phone must be in E.164 format (+123...)");
    }

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to
    });

    console.log("SMS sent:", {
      to,
      sid: response.sid
    });

    return response;

  } catch (err) {
    console.error("❌ Twilio SMS error:", err.message);
    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSMS };