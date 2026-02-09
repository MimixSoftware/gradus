const authService = require("./auth.service");
const authValidation = require("./auth.validation");

async function register(req, res, next) {
	const validated = authValidation.validateRegisterInput(req.body);

	const user = await authService.register(validated);

	req.session.userId = user.id;

	return res.status(201).json({
		message: "Registered successfully.",
		user,
	});
}

async function login(req, res, next) {
	const validated = authValidation.validateLoginInput(req.body);

	const user = await authService.login(validated);

	req.session.regenerate((regenErr) => {
		if (regenErr) return next(regenErr);

		req.session.userId = user.id;

		return res.status(200).json({
			message: "Logged in.",
			user,
		});
	});
}

function logout(req, res, next) {
	req.session.destroy((err) => {
	if (err) return next(err);

		res.clearCookie("gradus.sid");
		return res.status(200).json({ message: "Logged out." });
	});
}

async function me(req, res, next) {
	if (!req.session.userId) {
		return res.status(401).json({ message: "Not authenticated." });
	}

	const user = await authService.getUserById(req.session.userId);
	return res.status(200).json({ user });
}

module.exports = { register, login, logout, me };