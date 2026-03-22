const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateRegisterInput({ email, forename, surname, password, confirmPassword } = {}) {
	forename = v.validateRequiredString(forename, "Forename", { max: 100 });
	surname = v.validateOptionalString(surname, "Surname", { max: 100 }) ?? null;
	email = v.validateRequiredString(email, "Email", {
		toLowerCase: true,
		max: 255,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		patternMessage: "Invalid email format."
	});
	password = v.validateRequiredString(password, "Password", { trim: false, min: 8, max: 72 });

	if (password !== confirmPassword) {
		throw new AppError("Passwords do not match.", 400);
	}

	return {
		email,
		forename,
		surname,
		password
	};
}

function validateLoginInput({ email, password } = {}) {
	email = v.validateRequiredString(email, "Email", {
		toLowerCase: true,
		max: 255,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		patternMessage: "Invalid email format."
	});
	password = v.validateRequiredString(password, "Password", { trim: false, max: 72 });

	return {
		email,
		password
	};
}

module.exports = { validateRegisterInput, validateLoginInput };