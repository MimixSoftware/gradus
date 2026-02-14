const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

const ASSIGNMENT_STATUSES = ["active", "completed"];

function validateCreateInModuleInput({ name, description, weight, confidence, deadline } = {}) {
    name = v.validateRequiredString(name, "Name", { max: 100 });
    description = v.validateOptionalString(description, "Description", { max: 500 }) ?? null;
    weight = v.validateOptionalInt(weight, "Weight", { min: 1, max: 100 }) ?? null;
	confidence = v.validateOptionalInt(confidence, "Confidence", { min: 1, max: 5 }) ?? null;
	deadline = v.validateOptionalUtcDatetime(deadline, "Deadline") ?? null;

	return { name, description, weight, confidence, deadline };
}

function validateUpdateInput({ name, description, status, weight, confidence, deadline } = {}) {
	const hasName = name !== undefined;
	const hasDescription = description !== undefined;
    const hasStatus = status !== undefined;
	const hasWeight = weight !== undefined;
    const hasConfidence = confidence !== undefined;
    const hasDeadline = deadline !== undefined;

	
	if (!hasName && !hasDescription && !hasStatus && !hasWeight && !hasConfidence && !hasDeadline) {
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
		updates.status = v.validateRequiredEnum(status, "Status", ASSIGNMENT_STATUSES);
	}
	if (hasWeight) {
		updates.weight = v.validateOptionalInt(weight, "Weight", { min: 1, max: 100 });
	}
	if (hasConfidence) {
		updates.confidence = v.validateOptionalInt(weight, "Confidence", { min: 1, max: 5 });
	}
	if (hasDeadline) {
		updates.deadline = v.validateOptionalUtcDatetime(deadline, "Deadline");
	}

	return updates;
}

module.exports = { validateCreateInModuleInput, validateUpdateInput };