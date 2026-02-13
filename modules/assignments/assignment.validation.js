const AppError = require("../../utils/AppError");

const ASSIGNMENT_STATUSES = ["active", "archived"];

function parseOptionalInt(value, field, min, max) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const num = Number(value);

	if (!Number.isInteger(num) || num < min || num > max) {
		throw new AppError(`${field} must be an integer between ${min} and ${max}.`, 400);
	}

	return num;
}

function parseOptionalUtcDatetime(value) {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;

	if (typeof value !== "string") {
		throw new AppError("Deadline must be an ISO UTC datetime string.", 400);
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new AppError("Invalid deadline datetime.", 400);
	}

	return date.toISOString().slice(0, 19).replace("T", " ");
}

function validateCreateInModuleInput({ name, description, weight, confidence, deadline } = {}) {
	name = name?.trim();
    description = description?.trim();
	
	if (!name) {
		throw new AppError("Name is required.", 400);
	}

	if (name.length > 100) {
		throw new AppError("Name must not exceed 100 characters.", 400);
	}

    if (!description) {
        description = null;
	} else if (description.length > 500) {
		throw new AppError("Description must not exceed 500 characters.", 400);
	}

	weight = parseOptionalInt(weight, "Weight", 1, 100);

	confidence = parseOptionalInt(confidence, "Confidence", 1, 5);

	deadline = parseOptionalUtcDatetime(deadline) ?? null;

	return {
		name,
		description,
		weight,
        confidence,
        deadline
	};
}

function validateUpdateInput({ name, description, status, weight, confidence, deadline } = {}) {
	const hasName = name !== undefined;
	const hasDescription = description !== undefined;
    const hasStatus = status !== undefined;
	const hasWeight = weight !== undefined;
    const hasConfidence = confidence !== undefined;
    const hasDeadline = deadline !== undefined;

	
	if (!hasName && !hasDescription && !hasWeight && !hasConfidence && !hasDeadline) {
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

	if (description !== undefined) {
		description = description?.trim();

		if (!description) {
			updates.description = null;
		} else {
			if (description.length > 500) {
				throw new AppError("Description must not exceed 500 characters.", 400);
			}
			updates.description = description;
		}
	}

    if (status !== undefined) {
		if (!ASSIGNMENT_STATUSES.includes(status)) {
			throw new AppError("Invalid assignment status.", 400);
		}
		updates.status = status;
	}
	
	if (weight !== undefined) {
		updates.weight = parseOptionalInt(weight, "Weight", 1, 100);
	}

	if (confidence !== undefined) {
		updates.confidence = parseOptionalInt(confidence, "Confidence", 1, 5);
	}

	if (deadline !== undefined) {
		updates.deadline = parseOptionalUtcDatetime(deadline);
	}

	return updates;
}

function validateAssignmentId(assignmentId) {
	if (!assignmentId) {
		throw new AppError("Assignment ID is required.", 400);
	}

	assignmentId = Number(assignmentId);

	if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
		throw new AppError("Invalid assignment ID.", 400);
	}

	return moduleId;
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

module.exports = { validateCreateInModuleInput, validateUpdateInput, validateAssignmentId, validateModuleId, validateSemesterId };