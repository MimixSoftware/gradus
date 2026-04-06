const authService = require("./auth.service");
const authValidation = require("./auth.validation");

async function startRegistration(req, res) {
	const validated = authValidation.validateStartRegistrationInput(req.body);

	const { email, expiresInMinutes } = await authService.startRegistration(validated);

	return res.status(201).json({ message: "Verification code sent successfully.", email, expiresInMinutes });
}

async function completeRegistration(req, res) {
	const validated = authValidation.validateCompleteRegistrationInput(req.body);

	const { user, settings } = await authService.completeRegistration(validated);

	req.session.user = user;
	req.session.settings = settings;

	return res.status(201).json({ message: "Registered successfully.", user});
}

async function resendRegistrationCode(req, res) {
	const validated = authValidation.validateResendRegistrationCodeInput(req.body);

	const { email, expiresInMinutes } = await authService.resendRegistrationCode(validated);

	return res.status(200).json({ message: "Verification code resent successfully.", email, expiresInMinutes });
}

async function login(req, res, next) {
	const validated = authValidation.validateLoginInput(req.body);

	const { user, settings } = await authService.login(validated);

	req.session.regenerate((regenErr) => {
		if (regenErr) return next(regenErr);

		req.session.user = user;
		req.session.settings = settings;

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

module.exports = { startRegistration, completeRegistration, resendRegistrationCode, login, logout };