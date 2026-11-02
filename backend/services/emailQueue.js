//emailQueue.js
const { Queue } = require("bullmq");
const redis = require("../config/redis");

const emailQueue = new Queue("emailQueue", {
  connection: redis
});

module.exports = emailQueue;