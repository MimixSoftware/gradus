const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateCreateInput({ name, startDate, endDate } = {}) {
	name = v.validateRequiredString(name, "Name", { max: 100 });
	startDate = v.validateRequiredDate(startDate, "Start Date");
	endDate = v.validateRequiredDate(endDate, "End Date");

	if (startDate > endDate) {
		throw new AppError("Start date cannot be after end date.", 400);
	}

	return { name, startDate, endDate };
}

function validateUpdateInput({ name, startDate, endDate } = {}) {
	const hasName = name !== undefined;
	const hasStart = startDate !== undefined;
	const hasEnd = endDate !== undefined;

	
	if (!hasName && !hasStart && !hasEnd) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasName) {
		updates.name = v.validateRequiredString(name, "Name", { max: 100 });
	}
	if (hasStart || hasEnd) {
		if (!hasStart || !hasEnd) {
			throw new AppError("Both start date and end date must be provided.", 400);
		}

		updates.startDate = v.validateRequiredDate(startDate, "Start Date");
		updates.endDate = v.validateRequiredDate(endDate, "End Date");
	}

	return updates;
}

module.exports = { validateCreateInput, validateUpdateInput };