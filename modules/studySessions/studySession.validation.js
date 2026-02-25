const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateCreateInSemesterInput({ dayOfWeek, startTime, durationMinutes } = {}) {
	dayOfWeek = v.validateRequiredInt(dayOfWeek, "Day of Week", { min: 0, max: 6 });
	startTime = v.validateRequiredUtcDatetime(startTime, "Start Time");
	durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 1, max: 1440 });

	const date = new Date(startTime);
	const startMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
	if (startMinutes + durationMinutes > 1440) {
		throw new AppError("Study session cannot extend past midnight.", 400);
	}

	return { dayOfWeek, startTime, durationMinutes };
}

function validateUpdateInput({ dayOfWeek, startTime, durationMinutes } = {}) {
	const hasDayOfWeek = dayOfWeek !== undefined;
	const hasStartTime = startTime !== undefined;
	const hasDurationMinutes = durationMinutes !== undefined;

	
	if (!hasDayOfWeek && !hasStartTime && !hasDurationMinutes) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasDayOfWeek) {
		updates.dayOfWeek = v.validateRequiredInt(dayOfWeek, "Day of Week", { min: 0, max: 6 });
	}
	if (hasStartTime) {
		updates.startTime = v.validateRequiredUtcDatetime(startTime, "Start Time");
	}
	if (hasDurationMinutes) {
		updates.durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 1, max: 1440 });
	}

	if (hasStartTime && hasDurationMinutes) {
		const date = new Date(updates.startTime);
		const startMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
		if (startMinutes + updates.durationMinutes > 1440) {
			throw new AppError("Study session cannot extend past midnight.", 400);
		}
	}

	return updates;
}

module.exports = { validateCreateInSemesterInput, validateUpdateInput };