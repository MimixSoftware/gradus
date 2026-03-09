const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

const TASK_STATUSES = ["todo", "doing", "done"];

function validateCreateInAssignmentInput({ name, description, deadline, etcMinutes } = {}) {
	name = v.validateRequiredString(name, "Name", { max: 100 });
	description = v.validateOptionalString(description, "Description", { max: 500 }) ?? null;
	deadline = v.validateOptionalUtcDatetime(deadline, "Deadline") ?? null;
	etcMinutes = v.validateOptionalInt(etcMinutes, "Estimated Completion Time", { min: 15, max: 1440, step: 15 }) ?? null;

	return { name, description, deadline, etcMinutes };
}

function validateUpdateInput({ name, description, status, deadline, etcMinutes, atcMinutes } = {}) {
	const hasName = name !== undefined;
	const hasDescription = description !== undefined;
	const hasStatus = status !== undefined;
	const hasDeadline = deadline !== undefined;
	const hasEtcMinutes = etcMinutes !== undefined;
	const hasAtcMinutes = atcMinutes !== undefined;

	
	if (!hasName && !hasDescription && !hasStatus && !hasWeight && !hasConfidence && !hasDeadline && !hasEtcMinutes && !hasAtcMinutes) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasName) {
		updates.name = v.validateRequiredString(name, "Name", { max: 100 });
	}
	if (hasDescription) {
		updates.description = v.validateOptionalString(description, "Description", { max: 500 });
	}
	if (hasStatus) {
		updates.status = v.validateRequiredEnum(status, "Status", TASK_STATUSES);
	}
	if (hasDeadline) {
		updates.deadline = v.validateOptionalUtcDatetime(deadline, "Deadline");
	}
	if (hasEtcMinutes) {
		updates.etcMinutes = v.validateOptionalInt(etcMinutes, "Estimated Completion Time", { min: 15, max: 1440, step: 15 });
	}
	if (hasAtcMinutes) {
		updates.atcMinutes = v.validateOptionalInt(atcMinutes, "Actual Completion Time", { min: 1, max: 1440 });
	}

	return updates;
}

module.exports = { validateCreateInAssignmentInput, validateUpdateInput };