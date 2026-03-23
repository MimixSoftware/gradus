const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

const THEMES = ["light", "dark", "system"];

function validateUpdateInput({ activeSemesterId, theme, forename, surname } = {}) {
	const hasActiveSemesterId = activeSemesterId !== undefined;
	const hasTheme = theme !== undefined;
	const hasForename = forename !== undefined;
	const hasSurname = surname !== undefined;
	
	if (!hasActiveSemesterId && !hasTheme && !hasForename && !hasSurname) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasActiveSemesterId) {
		updates.activeSemesterId = v.validateOptionalInt(activeSemesterId, "Active Semester ID", { min: 1 });
	}
	if (hasTheme) {
		updates.theme = v.validateRequiredEnum(theme, "Theme", THEMES);
	}
	if (hasForename) {
		updates.forename = v.validateRequiredString(forename, "Forename", { max: 100 });
	}
	if (hasSurname) {
		updates.surname = v.validateOptionalString(surname, "Surname", { max: 100 });
	}

	return updates;
}

module.exports = { validateUpdateInput };