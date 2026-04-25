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
		pattern: /^\d{6}$/,
		patternMessage: "Invalid or expired verification code." 
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

function validateChangePasswordInput({ currentPassword, newPassword, confirmPassword } = {}) {
	currentPassword = v.validateRequiredString(currentPassword, "Current Password", { trim: false, max: 72 });
	newPassword = v.validateRequiredString(newPassword, "New Password", { trim: false, min: 8, max: 72 });

	if (newPassword !== confirmPassword) {
		throw new AppError("Passwords do not match.", 400);
	}

	if (currentPassword === newPassword) {
		throw new AppError("New password must be different from the current password.", 400);
	}

	return {
		currentPassword,
		newPassword
	};
}

function validateStartPasswordResetInput({ email } = {}) {
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

function validateCompletePasswordResetInput({ resetToken, newPassword, confirmPassword } = {}) {
	newPassword = v.validateRequiredString(newPassword, "New Password", { trim: false, min: 8, max: 72 });

	if (newPassword !== confirmPassword) {
		throw new AppError("Passwords do not match.", 400);
	}

	return {
		resetToken,
		newPassword
	};
}

function validateDeleteAccountInput({ password } = {}) {
	password = v.validateRequiredString(password, "Password", { trim: false, max: 72 });

	return {
		password
	};
}

module.exports = { validateStartRegistrationInput, validateCompleteRegistrationInput, validateResendRegistrationCodeInput, validateLoginInput, validateChangePasswordInput, validateStartPasswordResetInput, validateCompletePasswordResetInput, validateDeleteAccountInput };