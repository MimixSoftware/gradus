const AppError = require("../../utils/AppError");

function validateCreateInput({ name, startDate, endDate, availability } = {}) {
	name = name?.trim();

	
	if (!name || !startDate || !endDate || !availability) {
		throw new AppError("All fields are required.", 400);
	}

	if (name.length > 100) {
		throw new AppError("Name must not exceed 100 characters.", 400);
	}

	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

	if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
		throw new AppError("Dates must be in YYYY-MM-DD format.", 400);
	}

	const start = new Date(`${startDate}T00:00:00Z`);
	const end = new Date(`${endDate}T00:00:00Z`);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw new AppError("Invalid start date or end date.", 400);
	}

	if (start > end) {
		throw new AppError("Start date cannot be after end date.", 400);
	}

	if (!Array.isArray(availability)) {
		throw new AppError("Availability must be an array.", 400);
	}

	if (availability.length !== 168) {
		throw new AppError("Availability must contain exactly 168 slots.", 400);
	}

	availability = availability.map((x, i) => {
		if (x === 0 || x === 1) return x;

		throw new AppError(`Availability slot ${i} must be 0 or 1.`, 400);
	});

	return {
		name,
		startDate,
		endDate,
		availability
	};
}

function validateUpdateInput({ name, startDate, endDate, availability } = {}) {
	const hasName = name !== undefined;
	const hasStart = startDate !== undefined;
	const hasEnd = endDate !== undefined;
	const hasAvailability = availability !== undefined;

	
	if (!hasName && !hasStart && !hasEnd && !hasAvailability) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasName) {
		name = name?.trim();

		if (!name) {
			throw new AppError("Name must not be empty.", 400);
		}

		if (name.length > 100) {
			throw new AppError("Name must not exceed 100 characters.", 400);
		}

		updates.name = name;
	}

	if (hasStart || hasEnd) {
		if (!hasStart || !hasEnd) {
			throw new AppError("Both start date and end date must be provided.", 400);
		}

		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

		if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
			throw new AppError("Dates must be in YYYY-MM-DD format.", 400);
		}

		const start = new Date(`${startDate}T00:00:00Z`);
		const end = new Date(`${endDate}T00:00:00Z`);

		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			throw new AppError("Invalid start date or end date.", 400);
		}

		if (start > end) {
			throw new AppError("Start date cannot be after end date.", 400);
		}

		updates.startDate = startDate;
		updates.endDate = endDate;
	}
	
	if (hasAvailability) {
		if (!Array.isArray(availability)) {
			throw new AppError("Availability must be an array.", 400);
		}

		if (availability.length !== 168) {
			throw new AppError("Availability must contain exactly 168 slots.", 400);
		}

		availability = availability.map((x, i) => {
			if (x === 0 || x === 1) return x;

			throw new AppError(`Availability slot ${i} must be 0 or 1.`, 400);
		});

		updates.availability = availability;
	}

	return updates;
}

function validateSemesterId(semesterId) {
	if (!semesterId) {
		throw new AppError("Semester ID is required.", 400);
	}

	semesterId = Number(semesterId);

	if (!Number.isInteger(semesterId) || semesterId <= 0) {
		throw new AppError("Invalid semester ID.", 400);
	}

	return semesterId;
}

module.exports = { validateCreateInput, validateUpdateInput, validateSemesterId };