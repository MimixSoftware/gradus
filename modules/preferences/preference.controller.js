const preferenceService = require("./preference.service");
const preferenceValidation = require("./preference.validation");

async function getByUserId(req, res) {
	const preferences = await preferenceService.getByUserId(req.user.id);

	return res.status(200).json({ preferences });
}

async function update(req, res) {
	const validated = preferenceValidation.validateUpdateInput(req.body);

	const preferences = await preferenceService.update(req.user.id, validated);

	req.session.preferences = preferences;

	return res.status(200).json({ message: "Preferences updated successfully.", preferences });
}

module.exports = { getByUserId, update };