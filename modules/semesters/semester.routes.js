const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const semesterController = require("./semester.controller");
const moduleController = require("../modules/module.controller");
const assignmentController = require("../assignments/assignment.controller");
const studySessionController = require("../studySessions/studySession.controller");
const scheduledTaskController = require("../scheduledTasks/scheduledTask.controller");

router.get("/", requireApiAuth, asyncHandler(semesterController.findAll));
router.post("/", requireApiAuth, asyncHandler(semesterController.create));
router.get("/:semesterId", requireApiAuth, asyncHandler(semesterController.findById));
router.patch("/:semesterId", requireApiAuth, asyncHandler(semesterController.update));
router.delete("/:semesterId", requireApiAuth, asyncHandler(semesterController.remove));

router.get("/:semesterId/modules", requireApiAuth, asyncHandler(moduleController.findAllBySemester));
router.post("/:semesterId/modules", requireApiAuth, asyncHandler(moduleController.createInSemester));

router.get("/:semesterId/assignments", requireApiAuth, asyncHandler(assignmentController.findAllBySemester));

router.get("/:semesterId/study-sessions", requireApiAuth, asyncHandler(studySessionController.findAllBySemester));
router.post("/:semesterId/study-sessions", requireApiAuth, asyncHandler(studySessionController.createInSemester));

router.get("/:semesterId/scheduled-tasks", requireApiAuth, asyncHandler(scheduledTaskController.findAllBySemester));

module.exports = router;