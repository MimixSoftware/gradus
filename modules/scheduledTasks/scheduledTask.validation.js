const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateCreateInStudySessionInput({ taskId, sessionDate, startMinute, durationMinutes } = {}) {
    taskId = v.validateRequiredInt(taskId, "Task ID", { min: 1 });
    sessionDate = v.validateRequiredDate(sessionDate, "Session Date");
	startMinute = v.validateRequiredInt(startMinute, "Start Minute", { min: 0, step: 15 });
	durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 15, max: 240, step: 15 });

	if (startMinute + durationMinutes > 240) {
		throw new AppError("Task does not fit into this study session.", 400);
	}

	return { dayOfWeek, startTime, durationMinutes };
}

function validateUpdateInput({ sessionDate, startMinute, durationMinutes } = {}) {
	const hasSessionDate = sessionDate !== undefined;
	const hasStartMinute = startMinute !== undefined;
    const hasDurationMinutes = durationMinutes !== undefined;

	
	if (!hasSessionDate && !hasStartMinute && !hasDurationMinutes) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasSessionDate) {
		updates.sessionDate = v.validateRequiredDate(sessionDate, "Session Date");
	}
	if (hasStartMinute) {
		updates.startMinute = v.validateRequiredInt(startMinute, "Start Minute", { min: 0, step: 15 });
	}
	if (hasDurationMinutes) {
		updates.durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 15, max: 240, step: 15 });
	}

	if (hasStartMinute && hasDurationMinutes) {
		if (startMinute + durationMinutes > 240) {
		throw new AppError("Task does not fit into this study session.", 400);
	}
	}

	return updates;
}

module.exports = { validateCreateInStudySessionInput, validateUpdateInput };