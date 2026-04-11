const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const semesterController = require("./semester.controller");
const moduleController = require("../modules/module.controller");
const assignmentController = require("../assignments/assignment.controller");
const taskController = require("../tasks/task.controller");
const studySessionController = require("../studySessions/studySession.controller");
const scheduledTaskController = require("../scheduledTasks/scheduledTask.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/aggregate", asyncHandler(semesterController.getAggregate));

router.get("/", asyncHandler(semesterController.findAll));
router.post("/", asyncHandler(semesterController.create));
router.get("/:semesterId", asyncHandler(semesterController.findById));
router.patch("/:semesterId", asyncHandler(semesterController.update));
router.delete("/:semesterId", asyncHandler(semesterController.remove));

router.get("/:semesterId/modules", asyncHandler(moduleController.findAllBySemester));
router.post("/:semesterId/modules", asyncHandler(moduleController.createInSemester));

router.get("/:semesterId/assignments", asyncHandler(assignmentController.findAllBySemester));

router.get("/:semesterId/tasks", asyncHandler(taskController.findAllBySemester));

router.get("/:semesterId/study-sessions", asyncHandler(studySessionController.findAllBySemester));
router.post("/:semesterId/study-sessions", asyncHandler(studySessionController.createInSemester));

router.get("/:semesterId/scheduled-tasks", asyncHandler(scheduledTaskController.findAllBySemester));

module.exports = router;