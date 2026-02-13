const assignmentService = require("./assignment.service");
const assignmentValidation = require("./assignment.validation");

async function findAll(req, res) {
	const assignments = await assignmentService.findAll(req.user.id);
	
	return res.status(200).json({ assignments });
}

async function findAllBySemester(req, res) {
	const semesterId = assignmentValidation.validateSemesterId(req.params.semesterId);

	const assignments = await assignmentService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ assignments });
}

async function findAllByModule(req, res) {
	const moduleId = assignmentValidation.validateModuleId(req.params.moduleId);

	const assignments = await assignmentService.findAllByModule(req.user.id, moduleId);

	return res.status(200).json({ assignments });
}

async function createInModule(req, res) {
	const moduleId = assignmentValidation.validateModuleId(req.params.moduleId);
	const validated = assignmentValidation.validateCreateInModuleInput(req.body);

	const assignment = await assignmentService.createInModule(req.user.id, moduleId, validated);

	return res.status(201).json({ message: "Assignment created successfully.", assignment });
}

async function findById(req, res) {
	const assignmentId = assignmentValidation.validateAssignmentId(req.params.assignmentId);

	const assignment = await assignmentService.findById(req.user.id, assignmentId);

	return res.status(200).json({ assignment });
}

async function update(req, res) {
	const assignmentId = assignmentValidation.validateAssignmentId(req.params.assignmentId);
	const validated = assignmentValidation.validateUpdateInput(req.body);

	const assignment = await assignmentService.update(req.user.id, assignmentId, validated);

	return res.status(200).json({ message: "Assignment updated successfully.", assignment });
}

async function remove(req, res) {
	const assignmentId = assignmentValidation.validateAssignmentId(req.params.assignmentId);

	await assignmentService.remove(req.user.id, assignmentId);

	return res.status(204).json({ message: "Assignment deleted successfully." });
}

module.exports = { findAll, findAllBySemester, findAllByModule, createInModule, findById, update, remove };