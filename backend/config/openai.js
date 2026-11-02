
// config/openai.js

const OpenAI = require("openai");

let client = null;

if (process.env.OPENAI_API_KEY) {

    client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    console.log("✅ OpenAI initialized successfully");

} else {

    console.warn(
        "⚠️ OpenAI disabled: OPENAI_API_KEY missing"
    );

}

module.exports = client;
