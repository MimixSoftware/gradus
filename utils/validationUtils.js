const AppError = require("./AppError");

function validateId(value, field) {
    if (value === undefined || value === null || value === "") {
        throw new AppError(`${field} is required.`, 400);
    }

    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
		throw new AppError(`${field} is invalid.`, 400);
	}

    return id;
}

module.exports = {
    validateId,
};