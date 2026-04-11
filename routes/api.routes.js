const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../middleware/authGuards");
const { rateLimiter } = require("../middleware/rateLimiter");
const asyncHandler = require('../utils/asyncHandler');
const AppError = require("../utils/AppError");

const settingsService = require("../modules/settings/settings.service");
const semesterService = require("../modules/semesters/semester.service");
const moduleService = require("../modules/modules/module.service");
const assignmentService= require("../modules/assignments/assignment.service");
const taskService = require("../modules/tasks/task.service");
const studySessionService = require("../modules/studySessions/studySession.service");
const scheduledTaskService = require("../modules/scheduledTasks/scheduledTask.service");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/dashboard", asyncHandler(async (req, res) => {
	const { activeSemesterId } = await settingsService.getByUserId(req.user.id);

	const semesters = await semesterService.findAll(req.user.id);

	if (!activeSemesterId) {
		return res.status(200).json({ semesters });
	}

	const modules = await moduleService.findAllBySemester(req.user.id, activeSemesterId);
	const assignments = await assignmentService.findAllBySemester(req.user.id, activeSemesterId);
	const tasks = await taskService.findAllBySemester(req.user.id, activeSemesterId);
	const studySessions = await studySessionService.findAllBySemester(req.user.id, activeSemesterId);
	const scheduledTasks = await scheduledTaskService.findAllBySemester(req.user.id, activeSemesterId);

	return res.status(200).json({ 
		semesters,
		modules,
		assignments,
		tasks,
		studySessions,
		scheduledTasks
	 });
}));

module.exports = router;