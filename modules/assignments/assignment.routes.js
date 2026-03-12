const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const assignmentController = require("./assignment.controller");
const taskController = require("../tasks/task.controller");
const scheduledTaskController = require("../scheduledTasks/scheduledTask.controller");

router.get("/", requireApiAuth, asyncHandler(assignmentController.findAll));
router.get("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.findById));
router.patch("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.update));
router.delete("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.remove));

router.get("/:assignmentId/tasks", requireApiAuth, asyncHandler(taskController.findAllByAssignment));
router.post("/:assignmentId/tasks", requireApiAuth, asyncHandler(taskController.createInAssignment));

router.get("/:assignmentId/scheduled-tasks", requireApiAuth, asyncHandler(scheduledTaskController.findAllByAssignment));

module.exports = router;