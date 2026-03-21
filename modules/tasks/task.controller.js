const taskService = require("./task.service");
const taskValidation = require("./task.validation");
const taskEstimationService = require("./taskEstimation.service");
const { validateRequiredInt } = require("../../utils/validationUtils");

async function findAll(req, res) {
	const tasks = await taskService.findAll(req.user.id);
	
	return res.status(200).json({ tasks });
}

async function findAllByAssignment(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	const tasks = await taskService.findAllByAssignment(req.user.id, assignmentId);

	return res.status(200).json({ tasks });
}

async function findAllBySemester(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const tasks = await taskService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ tasks });
}

async function createInAssignment(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });
	const validated = taskValidation.validateCreateInAssignmentInput(req.body);

	const task = await taskService.createInAssignment(req.user.id, assignmentId, validated);

	return res.status(201).json({ message: "Task created successfully.", task });
}

async function findById(req, res) {
	const taskId = validateRequiredInt(req.params.taskId, "Task ID", { min: 1 });

	const task = await taskService.findById(req.user.id, taskId);

	return res.status(200).json({ task });
}

async function update(req, res) {
	const taskId = validateRequiredInt(req.params.taskId, "Task ID", { min: 1 });
	const validated = taskValidation.validateUpdateInput(req.body);

	const task = await taskService.update(req.user.id, taskId, validated);

	return res.status(200).json({ message: "Task updated successfully.", task });
}

async function remove(req, res) {
	const taskId = validateRequiredInt(req.params.taskId, "Task ID", { min: 1 });

	await taskService.remove(req.user.id, taskId);

	return res.status(204).json({ message: "Task deleted successfully." });
}

async function estimate(req, res) {
	const validated = taskValidation.validateEstimateInput(req.body);

	const estimatedMinutes = await taskService.estimate(req.user.id, validated);

	res.json({ message: "Task ETC estimated successfully.", estimatedMinutes });
}

module.exports = { findAll, findAllByAssignment, findAllBySemester, createInAssignment, findById, update, remove, estimate };