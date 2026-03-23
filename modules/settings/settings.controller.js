const settingsService = require("./settings.service");
const settingsValidation = require("./settings.validation");

async function getByUserId(req, res) {
	const settings = await settingsService.getByUserId(req.user.id);

	return res.status(200).json({ settings });
}

async function getAvatar(req, res) {
	const avatarPath = await settingsService.getAvatarPath(req.user.id);

	return res.sendFile(avatarPath);
}

async function update(req, res) {
	const validated = settingsValidation.validateUpdateInput(req.body);

	const settings = await settingsService.update(req.user.id, validated);

	req.session.settings = settings;

	return res.status(200).json({ message: "Settings updated successfully.", settings });
}

async function updateAvatar(req, res) {
	await settingsService.updateAvatar(req.user.id, req.file);

	res.status(200).json({ message: "Avatar updated successfully." });
}

async function deleteAvatar(req, res) {
	await settingsService.deleteAvatar(req.user.id);

	res.status(204).json({ message: "Avatar deleted successfully." });
}

module.exports = { getByUserId, getAvatar, update, updateAvatar, deleteAvatar };