const authService = require("./auth.service");
const authValidation = require("./auth.validation");

async function register(req, res, next) {
	const validated = authValidation.validateRegisterInput(req.body);

	const user = await authService.register(validated);

	req.session.user = {
		id: user.id,
		email: user.email,
		forename: user.forename,
		surname: user.surname
	};

	return res.status(201).json({ message: "Registered successfully." });
}

async function login(req, res, next) {
	const validated = authValidation.validateLoginInput(req.body);

	const user = await authService.login(validated);

	req.session.regenerate((regenErr) => {
		if (regenErr) return next(regenErr);

		req.session.user = {
			id: user.id,
			email: user.email,
			forename: user.forename,
			surname: user.surname
		};

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