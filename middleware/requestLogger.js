const { log } = require("../utils/logger");

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.length) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function getLogLevel(statusCode) {
    if (statusCode >= 500) return "ERROR";
    if (statusCode >= 400) return "WARN";
    return "INFO";
}

module.exports = function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();

    let captured = null;

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        captured = { type: "json", body };
        return originalJson(body);
    };

    const originalRender = res.render.bind(res);
    res.render = (view, locals = {}, cb) => {
        const { _locals, ...cleanLocals } = locals;
        captured = { type: "view", view, locals: cleanLocals };
        return originalRender(view, locals, cb);
    };
    res.on("finish", () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;

        const statusCode = res.statusCode;
        const level = getLogLevel(statusCode);

        let response;

        if (captured?.type === "view") {
            response = {
                statusCode,
                view: captured.view,
                locals: captured.locals
            };
        } else if (captured?.type === "json") {
            response = {
                statusCode,
                body: captured.body
            };
        } else {
            response = { statusCode };
        }

        log(
            level,
            level === "INFO" ? "Request processed successfully." : "Request failed.",
            {
                request: {
                    method: req.method,
                    url: req.originalUrl,
                    ipAddress: getClientIp(req)
                },
                response,
                meta: {
                    durationMs: Math.round(durationMs * 100) / 100
                }
            }
        );
    });

    next();
};