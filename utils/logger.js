const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(process.cwd(), "logs");

const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
const CURRENT_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
const CURRENT_LEVEL_NUM = LEVELS[CURRENT_LEVEL] ?? LEVELS.INFO;

let writeQueue = Promise.resolve();

function shouldLog(level) {
    const n = LEVELS[level] ?? LEVELS.INFO;
    return n >= CURRENT_LEVEL_NUM;
}

function ensureLogsDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function getLogPath(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return path.join(LOG_DIR, `log-${year}-${month}.json`);
}

function enqueueWrite(fn) {
    writeQueue = writeQueue.then(fn).catch((err) => {
        console.error("Log write failed:", err.message);
    });
}

async function appendEntry(entry) {
    ensureLogsDir();
    const logPath = getLogPath(new Date(entry.timestamp));

    let data = [];
    try {
        const raw = await fs.promises.readFile(logPath, "utf8");
        data = raw.trim() ? JSON.parse(raw) : [];
        if (!Array.isArray(data)) data = [];
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }

    data.push(entry);
    await fs.promises.writeFile(logPath, JSON.stringify(data, null, 2), "utf8");
}

function log(level, message, context = {}) {
    level = (level || "INFO").toUpperCase();
    if (!shouldLog(level)) return;

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
    };

    enqueueWrite(() => appendEntry(entry));
}

module.exports = { log };