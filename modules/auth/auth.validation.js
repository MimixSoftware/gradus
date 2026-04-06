const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateStartRegistrationInput({ email, forename, surname, password, confirmPassword } = {}) {
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

function validateCompleteRegistrationInput({ email, code } = {}) {
	email = v.validateRequiredString(email, "Email", {
		toLowerCase: true,
		max: 255,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		patternMessage: "Invalid email format."
	});
	code = v.validateRequiredString(code, "Verification Code", { 
		min: 6,
		max: 6,
		pattern: /^\d{6}$/,
		patternMessage: "Verification code must be a 6-digit number." 
	});

	return {
		email,
		code
	};
}

function validateResendRegistrationCodeInput({ email } = {}) {
	email = v.validateRequiredString(email, "Email", {
		toLowerCase: true,
		max: 255,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		patternMessage: "Invalid email format."
	});

	return {
		email
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

module.exports = { validateStartRegistrationInput, validateCompleteRegistrationInput, validateResendRegistrationCodeInput, validateLoginInput };