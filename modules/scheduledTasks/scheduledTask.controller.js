const scheduledTaskService = require("./scheduledTask.service");
const scheduledTaskValidation = require("./scheduledTask.validation");
const { validateRequiredInt } = require("../../utils/validationUtils");

async function findAll(req, res) {
	const scheduledTasks = await scheduledTaskService.findAll(req.user.id);
	
	return res.status(200).json({ scheduledTasks });
}

async function findAllByStudySession(req, res) {
	const studySessionId = validateRequiredInt(req.params.studySessionId, "Study Session ID", { min: 1 });

	const scheduledTasks = await scheduledTaskService.findAllByStudySession(req.user.id, studySessionId);

	return res.status(200).json({ scheduledTasks });
}

async function findAllByAssignment(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	const scheduledTasks = await scheduledTaskService.findAllByAssignment(req.user.id, assignmentId);

	return res.status(200).json({ scheduledTasks });
}

async function findAllBySemester(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const scheduledTasks = await scheduledTaskService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ scheduledTasks });
}

async function createInStudySession(req, res) {
	const studySessionId = validateRequiredInt(req.params.studySessionId, "Study Session ID", { min: 1 });
	const validated = scheduledTaskValidation.validateCreateInStudySessionInput(req.body);

	const scheduledTask = await scheduledTaskService.createInStudySession(req.user.id, studySessionId, validated);

	return res.status(201).json({ message: "Task scheduled successfully.", scheduledTask });
}

async function findById(req, res) {
	const scheduledTaskId = validateRequiredInt(req.params.scheduledTaskId, "Scheduled Task ID", { min: 1 });

	const scheduledTask = await scheduledTaskService.findById(req.user.id, scheduledTaskId);

	return res.status(200).json({ scheduledTask });
}

async function update(req, res) {
	const scheduledTaskId = validateRequiredInt(req.params.scheduledTaskId, "Scheduled Task ID", { min: 1 });
	const validated = scheduledTaskValidation.validateUpdateInput(req.body);

	const scheduledTask = await scheduledTaskService.update(req.user.id, scheduledTaskId, validated);

	return res.status(200).json({ message: "Scheduled task updated successfully.", scheduledTask });
}

async function remove(req, res) {
	const scheduledTaskId = validateRequiredInt(req.params.scheduledTaskId, "Scheduled Task ID", { min: 1 });

	await scheduledTaskService.remove(req.user.id, scheduledTaskId);

	return res.status(204).json({ message: "Task unscheduled successfully." });
}

module.exports = { findAll, findAllByStudySession, findAllByAssignment, findAllBySemester, createInStudySession, findById, update, remove };