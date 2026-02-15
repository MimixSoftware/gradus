const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

const THEMES = ["light", "dark", "system"];

function validateUpdateInput({ activeSemesterId, theme } = {}) {
	const hasActiveSemesterId = activeSemesterId !== undefined;
	const hasTheme = theme !== undefined;

	
	if (!hasActiveSemesterId && !hasTheme) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasActiveSemesterId) {
		updates.activeSemesterId = v.validateOptionalInt(activeSemesterId, "Active Semester ID", { min: 1 });
	}
	if (hasTheme) {
		updates.theme = v.validateRequiredEnum(theme, "Theme", THEMES);
	}

	return updates;
}

module.exports = { validateUpdateInput };