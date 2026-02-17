const AppError = require("./AppError");

function validateRequiredString(value, label, { trim = true, toLowerCase = false, min = 1, max, pattern, patternMessage } = {}) {
	if (value === undefined || value === null) {
		throw new AppError(`${label} is required.`, 400);
	}
	if (typeof value !== "string") {
		throw new AppError(`${label} must be a string.`, 400);
	}

	let str = value;
	
	if (trim) str = str.trim();
	if (toLowerCase) str = str.toLowerCase();

	if (str.length < min) {
		if (min === 1) throw new AppError(`${label} must not be empty.`, 400);
		throw new AppError(`${label} must be at least ${min} characters long.`, 400);
	}

	if (max !== undefined && str.length > max) {
		throw new AppError(`${label} must not exceed ${max} characters.`, 400);
	}

	if (pattern && !pattern.test(str)) {
        throw new AppError(patternMessage ?? `${label} is invalid.`, 400);
    }

	return str;
}

function validateOptionalString(value, label, options = {}) {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;
	return validateRequiredString(value, label, options);
}

function validateRequiredInt(value, label, { min, max } = {}) {
	if (value === undefined || value === null || value === "") {
		throw new AppError(`${label} is required.`, 400);
	}

	const num = Number(value);

	if (!Number.isInteger(num)) {
		throw new AppError(`${label} must be an integer.`, 400);
	}

	if (min !== undefined && num < min) {
		if (max !== undefined) {
			throw new AppError(`${label} must be between ${min} and ${max}.`, 400);
		}
		throw new AppError(`${label} must be at least ${min}.`, 400);
	}

	if (max !== undefined && num > max) {
		if (min !== undefined) {
			throw new AppError(`${label} must be between ${min} and ${max}.`, 400);
		}
		throw new AppError(`${label} must be at most ${max}.`, 400);
	}

	return num;
}

function validateOptionalInt(value, label, options = {}) {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;
	return validateRequiredInt(value, label, options);
}

function validateRequiredEnum(value, label, allowedValues) {
	if (value === undefined || value === null || value === "") {
		throw new AppError(`${label} is required.`, 400);
	}

	if (!allowedValues.includes(value)) {
		throw new AppError(`${label} must be one of: ${allowedValues.join(", ")}.`, 400);
	}

	return value;
}

function validateRequiredDate(value, label) {
	if (value === undefined || value === null || value === "") {
		throw new AppError(`${label} is required.`, 400);
	}
	if (typeof value !== "string") {
		throw new AppError(`${label} must be ia string.`, 400);
	}

	const v = value.trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) {
		throw new AppError(`${label} must be in YYYY-MM-DD format.`, 400);
	}

	const year = Number(m[1]);
	const month = Number(m[2]);
	const day = Number(m[3]);

	const d = new Date(Date.UTC(year, month - 1, day));
	if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
		throw new AppError(`${label} must be a valid date.`, 400);
	}

	return v;
}

function validateRequiredUtcDatetime(value, label) {
	if (value === undefined || value === null || value === "") {
		throw new AppError(`${label} is required.`, 400);
	}
	if (typeof value !== "string") {
		throw new AppError(`${label} must be a string.`, 400);
	}

	const v = value.trim();
	if (!/Z$/i.test(v)) {
		throw new AppError(`${label} must be in UTC and end with 'Z' (e.g., 2026-02-13T15:30:00Z).`, 400);
	}

	const d = new Date(v);
	if (Number.isNaN(d.getTime())) {
		throw new AppError(`${label} must be a valid UTC datetime.`, 400);
	}

	const pad = (n) => String(n).padStart(2, "0");

	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function validateOptionalUtcDatetime(value, label) {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;
	return validateRequiredUtcDatetime(value, label);
}

function validateBinaryIntArray(value, label, expectedLength) {
	if (value === undefined || value === null) {
		throw new AppError(`${label} is required.`, 400);
	}

	if (!Array.isArray(value)) {
		throw new AppError(`${label} must be an array.`, 400);
	}

	if (value.length !== expectedLength) {
		throw new AppError(`${label} must contain exactly ${expectedLength} items.`, 400);
	}

	return value.map((x, i) => {
		if (x === 0 || x === 1) return x;
		throw new AppError(`${label} slot ${i} must be 0 or 1.`, 400);
	});
}

module.exports = {
	validateRequiredString,
	validateOptionalString,
	validateRequiredInt,
	validateOptionalInt,
	validateRequiredEnum,
	validateRequiredDate,
	validateRequiredUtcDatetime,
	validateOptionalUtcDatetime,
	validateBinaryIntArray
};