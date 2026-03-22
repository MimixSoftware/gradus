const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateCreateInStudySessionInput({ taskId, sessionDate, position, durationMinutes } = {}) {
    taskId = v.validateRequiredInt(taskId, "Task ID", { min: 1 });
    sessionDate = v.validateRequiredDate(sessionDate, "Session Date");
	position = v.validateOptionalInt(position, "Position", { min: 0 });
	durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 15, max: 240, step: 15 });

	return { taskId, sessionDate, position, durationMinutes };
}

function validateUpdateInput({ position, durationMinutes } = {}) {
	const hasPosition = position !== undefined;
    const hasDurationMinutes = durationMinutes !== undefined;

	
	if (!hasPosition && !hasDurationMinutes) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasPosition) {
		updates.position = v.validateOptionalInt(position, "Position", { min: 0 });
	}
	if (hasDurationMinutes) {
		updates.durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 15, max: 240, step: 15 });
	}

	return updates;
}

function validateCreateManyInput({ allocations } = {}) {
	if (!Array.isArray(allocations)) {
		throw new AppError("Allocations must be an array.", 400);
	}
	if (allocations.length === 0) {
		throw new AppError("At least one allocation is required.", 400);
	}

	const validatedAllocations = allocations.map((allocation) => {
		let { taskId, studySessionId, sessionDate, position, durationMinutes } = allocation ?? {};

		taskId = v.validateRequiredInt(taskId, "Task ID", { min: 1 });
		studySessionId = v.validateRequiredInt(studySessionId, "Study Session ID", { min: 1 });
		sessionDate = v.validateRequiredDate(sessionDate, "Session Date");
		position = v.validateOptionalInt(position, "Position", { min: 0 });
		durationMinutes = v.validateRequiredInt(durationMinutes, "Duration", { min: 15, max: 240, step: 15 });

		return { taskId, studySessionId, sessionDate, position, durationMinutes };
	});

	return { allocations: validatedAllocations };
}

module.exports = { validateCreateInStudySessionInput, validateUpdateInput, validateCreateManyInput };