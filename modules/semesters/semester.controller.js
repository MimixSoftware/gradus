const semesterService = require("./semester.service");
const semesterValidation = require("./semester.validation");
const { validateRequiredInt } = require("../../utils/validationUtils");

async function findAll(req, res) {
	const semesters = await semesterService.findAll(req.user.id);
	
	return res.status(200).json({ semesters });
}

async function create(req, res) {
	const validated = semesterValidation.validateCreateInput(req.body);

	const semester = await semesterService.create(req.user.id, validated);

	return res.status(201).json({ message: "Semester created successfully.", semester });
}

async function findById(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const semester = await semesterService.findById(req.user.id, semesterId);

	return res.status(200).json({ semester });
}

async function update(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });
	const validated = semesterValidation.validateUpdateInput(req.body);

	const semester = await semesterService.update(req.user.id, semesterId, validated);

	return res.status(200).json({ message: "Semester updated successfully.", semester });
}

async function remove(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	await semesterService.remove(req.user.id, semesterId);

	return res.status(204).json({ message: "Semester deleted successfully." });
}

module.exports = { findAll, create, findById, update, remove };