const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 600,

	standardHeaders: true,
	legacyHeaders: false,

	keyGenerator: (req) => {
		const ip = rateLimit.ipKeyGenerator(req);

		return req.user?.id || ip;
	},

	statusCode: 429,

	message: {
		statusCode: 429,
		message: "Too many requests, please try again later."
	}
});

const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,

	standardHeaders: true,
	legacyHeaders: false,

	keyGenerator: (req) => {
		return rateLimit.ipKeyGenerator(req);
	},

	statusCode: 429,

	message: {
		statusCode: 429,
		message: "Too many requests, please try again later."
	}
});

module.exports = { rateLimiter, authRateLimiter };