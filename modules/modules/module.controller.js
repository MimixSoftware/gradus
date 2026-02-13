const moduleService = require("./module.service");
const moduleValidation = require("./module.validation");

async function findAll(req, res) {
	const modules = await moduleService.findAll(req.user.id);
	
	return res.status(200).json({ modules });
}

async function findAllBySemester(req, res) {
	const semesterId = moduleValidation.validateSemesterId(req.params.semesterId);

	const modules = await moduleService.findAllBySemester(req.user.id, semesterId);

	return res.status(200).json({ modules });
}

async function createInSemester(req, res) {
	const semesterId = moduleValidation.validateSemesterId(req.params.semesterId);
	const validated = moduleValidation.validateCreateInSemesterInput(req.body);

	const module = await moduleService.createInSemester(req.user.id, semesterId, validated);

	return res.status(201).json({ messsage: "Module created successfully.", module });
}

async function findById(req, res) {
	const moduleId = moduleValidation.validateModuleId(req.params.moduleId);

	const module = await moduleService.findById(req.user.id, moduleId);

	return res.status(200).json({ module });
}

async function update(req, res) {
	const moduleId = moduleValidation.validateModuleId(req.params.moduleId);
	const validated = moduleValidation.validateUpdateInput(req.body);

	const module = await moduleService.update(req.user.id, moduleId, validated);

	return res.status(200).json({ message: "Module updated successfully.", module });
}

async function remove(req, res) {
	const moduleId = moduleValidation.validateModuleId(req.params.moduleId);

	await moduleService.remove(req.user.id, moduleId);

	return res.status(204).json({ message: "Module deleted successfully." });
}

module.exports = { findAll, findAllBySemester, createInSemester, findById, update, remove };