const settingsService = require("./settings.service");
const settingsValidation = require("./settings.validation");

async function getByUserId(req, res) {
	const settings = await settingsService.getByUserId(req.user.id);

	return res.status(200).json({ settings });
}

async function update(req, res) {
	const validated = settingsValidation.validateUpdateInput(req.body);

	const settings = await settingsService.update(req.user.id, validated);

	req.session.settings = settings;

	return res.status(200).json({ message: "Settings updated successfully.", settings });
}

module.exports = { getByUserId, update };