const studySessionService = require("./studySession.service");
const studySessionValidation = require("./studySession.validation");
const { validateRequiredInt } = require("../../utils/validationUtils");

async function findAll(req, res) {
	const studySessions = await studySessionService.findAll(req.user.id);
	
	return res.status(200).json({ studySessions });
}

async function findAllBySemester(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const studySessions = await studySessionService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ studySessions });
}

async function createInSemester(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });
	const validated = studySessionValidation.validateCreateInSemesterInput(req.body);

	const studySession = await studySessionService.createInSemester(req.user.id, semesterId, validated);

	return res.status(201).json({ message: "Study session created successfully.", studySession });
}

async function findById(req, res) {
	const studySessionId = validateRequiredInt(req.params.studySessionId, "Study Session ID", { min: 1 });

	const studySession = await studySessionService.findById(req.user.id, studySessionId);

	return res.status(200).json({ studySession });
}

async function update(req, res) {
	const studySessionId = validateRequiredInt(req.params.studySessionId, "Study Session ID", { min: 1 });
	const validated = studySessionValidation.validateUpdateInput(req.body);

	const studySession = await studySessionService.update(req.user.id, studySessionId, validated);

	return res.status(200).json({ message: "Study session updated successfully.", studySession });
}

async function remove(req, res) {
	const studySessionId = validateRequiredInt(req.params.studySessionId, "Study Session ID", { min: 1 });

	await studySessionService.remove(req.user.id, studySessionId);

	return res.status(204).json({ message: "Study session deleted successfully." });
}

module.exports = { findAll, findAllBySemester, createInSemester, findById, update, remove };