const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 600,

	standardHeaders: true,
	legacyHeaders: false,

	keyGenerator: (req) => {
		const ip = rateLimit.ipKeyGenerator(req);

		if (req.user?.id) {
			return `user:${req.user.id}`;
		}

		return `ip:${ip}`;
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
		const ip = rateLimit.ipKeyGenerator(req);
		return `ip:${ip}`;
	},

	statusCode: 429,

	message: {
		statusCode: 429,
		message: "Too many requests, please try again later."
	}
});

module.exports = { rateLimiter, authRateLimiter };