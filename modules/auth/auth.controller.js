const authService = require("./auth.service");
const authValidation = require("./auth.validation");

async function register(req, res) {
	const validated = authValidation.validateRegisterInput(req.body);

	const { user, preferences } = await authService.register(validated);

	req.session.user = user;
	req.session.preferences = preferences;

	return res.status(201).json({ message: "Registered successfully." });
}

async function login(req, res, next) {
	const validated = authValidation.validateLoginInput(req.body);

	const { user, preferences } = await authService.login(validated);

	req.session.regenerate((regenErr) => {
		if (regenErr) return next(regenErr);

		req.session.user = user;
		req.session.preferences = preferences;

		return res.status(200).json({ message: "Logged in successfully." });
	});
}

function logout(req, res, next) {
	req.session.destroy((err) => {
	if (err) return next(err);

		res.clearCookie("gradus.sid");
		return res.status(200).json({ message: "Logged out successfully." });
	});
}

module.exports = { register, login, logout };