const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL;

const redisClient = createClient({
url: REDIS_URL || "redis://127.0.0.1:6379",

socket: {
reconnectStrategy: (retries) => {
if (retries >= 5) {
console.log("⚠ Redis unavailable. Running without cache.");
return new Error("Redis disabled");
}


  return Math.min((retries + 1) * 1000, 5000);
},


},
});

let lastError = "";

redisClient.on("error", (err) => {
if (err.message !== lastError) {
lastError = err.message;
console.error("Redis error:", err.message);
}
});

redisClient.on("ready", () => {
lastError = "";
console.log("✅ Redis connected");
});

redisClient.on("end", () => {
console.log("Redis connection closed");
});

if (REDIS_URL) {
redisClient.connect().catch((err) => {
console.error(
"⚠ Redis connection failed. App will continue without cache:",
err.message
);
});
} else {
console.log(
"⚠ REDIS_URL not set. Redis disabled; app continues without cache."
);
}

module.exports = redisClient;
