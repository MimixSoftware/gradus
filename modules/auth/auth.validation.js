const AppError = require("../../utils/AppError");

function validateRegisterInput({ email, forename, surname, password, confirmPassword }) {
	email = email?.trim().toLowerCase();
	forename = forename?.trim();
	surname = surname?.trim();

	
	if (!email || !forename || !surname || !password || !confirmPassword) {
		throw new AppError("All fields are required.", 400);
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new AppError("Invalid email format.", 400);
	}

	if (email.length > 255) {
		throw new AppError("Email must not exceed 255 characters.", 400);
	}

	if (forename.length > 100) {
		throw new AppError("Forename must not exceed 100 characters.", 400);
	}

	if (surname.length > 100) {
		throw new AppError("Surname must not exceed 100 characters.", 400);
	}

	if (password.length < 8) {
		throw new AppError("Password must be at least 8 characters long.", 400);
	}

	if (password.length > 72) {
		throw new AppError("Password must not exceed 72 characters.", 400);
	}

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

function validateLoginInput({ email, password }) {
	email = email?.trim().toLowerCase();

	if (!email || !password) {
		throw new AppError("All fields are required.", 400);
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new AppError("Invalid email format.", 400);
	}

	if (email.length > 255) {
		throw new AppError("Email must not exceed 255 characters.", 400);
	}

	if (password.length > 72) {
		throw new AppError("Password must not exceed 72 characters.", 400);
	}

	return {
		email,
		password
	};
}

module.exports = { validateRegisterInput, validateLoginInput };