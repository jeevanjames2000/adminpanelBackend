// logger.js
const fs = require("fs");
const path = require("path");
const moment = require("moment");

const logDir = path.join(__dirname, "paymentLogs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const writeLog = (type, data) => {
  const date = moment().format("YYYY-MM-DD");
  const time = moment().format("HH:mm:ss");
  const filename = path.join(logDir, `${type}-${date}.log`);
  const logMessage = `[${time}] ${JSON.stringify(data)}\n`;

  fs.appendFile(filename, logMessage, (err) => {
    if (err) {
      console.error("Failed to write log:", err);
    }
  });
};

module.exports = {
  logSuccess: (data) => writeLog("success", data),
  logError: (data) => writeLog("error", data),
  logFailed: (data) => writeLog("failed", data),
  logCancelled: (data) => writeLog("cancelled", data),
};
