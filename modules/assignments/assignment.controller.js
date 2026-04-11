const { validateRequiredInt } = require("../../utils/validationUtils");

const assignmentService = require("./assignment.service");
const assignmentValidation = require("./assignment.validation");
const semesterService = require("../semesters/semester.service");
const moduleService = require("../modules/module.service");
const taskService = require("../tasks/task.service");
const scheduledTaskService = require("../scheduledTasks/scheduledTask.service");

async function findAll(req, res) {
	const assignments = await assignmentService.findAll(req.user.id);
	
	return res.status(200).json({ assignments });
}

async function findAllBySemester(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const assignments = await assignmentService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ assignments });
}

async function findAllByModule(req, res) {
	const moduleId = validateRequiredInt(req.params.moduleId, "Module ID", { min: 1 });

	const assignments = await assignmentService.findAllByModule(req.user.id, moduleId);

	return res.status(200).json({ assignments });
}

async function createInModule(req, res) {
	const moduleId = validateRequiredInt(req.params.moduleId, "Module ID", { min: 1 });
	const validated = assignmentValidation.validateCreateInModuleInput(req.body);

	const assignment = await assignmentService.createInModule(req.user.id, moduleId, validated);

	return res.status(201).json({ message: "Assignment created successfully.", assignment });
}

async function findById(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	const assignment = await assignmentService.findById(req.user.id, assignmentId);

	return res.status(200).json({ assignment });
}

async function update(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });
	const validated = assignmentValidation.validateUpdateInput(req.body);

	const assignment = await assignmentService.update(req.user.id, assignmentId, validated);

	return res.status(200).json({ message: "Assignment updated successfully.", assignment });
}

async function remove(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	await assignmentService.remove(req.user.id, assignmentId);

	return res.status(204).json();
}

async function getAggregate(req, res) {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });
	
	const assignment = await assignmentService.findById(req.user.id, assignmentId);
	const tasks = await taskService.findAllByAssignment(req.user.id, assignmentId);
	const scheduledTasks = await scheduledTaskService.findAllByAssignment(req.user.id, assignmentId);
	const module = await moduleService.findById(req.user.id, assignment.moduleId);
	const semester = await semesterService.findById(req.user.id, module.semesterId);

	return res.status(200).json({ 
		assignment,
		tasks,
		scheduledTasks,
		module,
		semester
	});
}

module.exports = { findAll, findAllBySemester, findAllByModule, createInModule, findById, update, remove, getAggregate };