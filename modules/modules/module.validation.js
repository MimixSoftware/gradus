const AppError = require("../../utils/AppError");

function validateCreateInput({ semesterId, name, credits, colour }) {
	name = name?.trim();
	credits = Number(credits ?? 0);
	colour = colour?.trim();
	
	if (!semesterId || !name || !colour) {
		throw new AppError("All fields are required.", 400);
	}

	semesterId = validateSemesterId(semesterId);

	if (name.length > 100) {
		throw new AppError("Name must not exceed 100 characters.", 400);
	}

	if (!Number.isInteger(credits) || credits < 0 || credits > 60) {
		throw new AppError("Credits must be an integer between 0 and 60.", 400);
	}

	if (!/^#[0-9A-Fa-f]{6}$/.test(colour)) {
		throw new AppError("Colour must be a valid hex code.", 400);
	}

	return {
		semesterId,
		name,
		credits,
		colour
	};
}

function validateUpdateInput({ name, credits, colour }) {
	const hasName = name !== undefined;
	const hasCredits = credits !== undefined;
	const hasColour = colour !== undefined;

	
	if (!hasName && !hasCredits && !hasColour) {
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

	if (hasCredits) {
		credits = Number(credits ?? 0);

		if (!Number.isInteger(credits) || credits < 0 || credits > 60) {
			throw new AppError("Credits must be an integer between 0 and 60.", 400);
		}

		updates.credits = credits;
	}
	
	if (hasColour) {
		colour = colour?.trim();

		if (!colour) {
			throw new AppError("Colour must not be empty.", 400);
		}

		if (!/^#[0-9A-Fa-f]{6}$/.test(colour)) {
			throw new AppError("Colour must be a valid hex code.", 400);
		}

		updates.colour = colour;
	}

	return updates;
}

function validateModuleId(moduleId) {
	if (!moduleId) {
		throw new AppError("Module ID is required.", 400);
	}

	moduleId = Number(moduleId);

	if (!Number.isInteger(moduleId) || moduleId <= 0) {
		throw new AppError("Invalid module ID.", 400);
	}

	return moduleId;
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

module.exports = { validateCreateInput, validateUpdateInput, validateModuleId };