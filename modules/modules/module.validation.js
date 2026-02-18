const v = require("../../utils/validationUtils");
const AppError = require("../../utils/AppError");

function validateCreateInSemesterInput({ name, credits, colour } = {}) {
	name = v.validateRequiredString(name, "Name", { max: 100 });
	credits = v.validateOptionalInt(credits, "Credits", { min: 0, max: 60 });
	colour = v.validateRequiredString(colour, "Colour", {
		pattern: /^#[0-9A-Fa-f]{6}$/,
		patternMessage: "Colour must be a valid hex code."
	});

	return {
		name,
		credits,
		colour
	};
}

function validateUpdateInput({ name, credits, colour } = {}) {
	const hasName = name !== undefined;
	const hasCredits = credits !== undefined;
	const hasColour = colour !== undefined;

	
	if (!hasName && !hasCredits && !hasColour) {
		throw new AppError("At least one field is required.", 400);
	}

	const updates = {};

	if (hasName) {
		updates.name = v.validateRequiredString(name, "Name", { max: 100 });;
	}
	if (hasCredits) {
		updates.credits = v.validateOptionalInt(credits, "Credits", { min: 0, max: 60 });
	}
	if (hasColour) {
		updates.colour = v.validateRequiredString(colour, "Colour", {
			pattern: /^#[0-9A-Fa-f]{6}$/,
			patternMessage: "Colour must be a valid hex code."
		});
	}

	return updates;
}

module.exports = { validateCreateInSemesterInput, validateUpdateInput };