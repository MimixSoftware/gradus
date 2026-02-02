const AppError = require("../../utils/AppError");

function validateRegisterInput({ email, forename, surname, password }) {
    if (!email || !forename || !surname || !password) {
        throw new AppError("All fields are required.", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError("Invalid email format.", 400);
    }

    if (password.length < 8) {
        throw new AppError("Password must be at least 8 characters long.", 400);
    }

    return {
        email: email.trim().toLowerCase(),
        forename: forename.trim(),
        surname: surname.trim(),
        password
    };
}

function validateLoginInput({ email, password }) {
    if (!email || !password) {
        throw new AppError("All fields are required.", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError("Invalid email format.", 400);
    }

    return {
        email: email.trim().toLowerCase(),
        password
    };
}

module.exports = { validateRegisterInput, validateLoginInput };