const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const assignmentController = require("./assignment.controller");
const taskController = require("../tasks/task.controller");
const scheduledTaskController = require("../scheduledTasks/scheduledTask.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/", asyncHandler(assignmentController.findAll));
router.get("/:assignmentId", asyncHandler(assignmentController.findById));
router.patch("/:assignmentId", asyncHandler(assignmentController.update));
router.delete("/:assignmentId", asyncHandler(assignmentController.remove));

router.get("/:assignmentId/tasks", asyncHandler(taskController.findAllByAssignment));
router.post("/:assignmentId/tasks", asyncHandler(taskController.createInAssignment));

router.get("/:assignmentId/scheduled-tasks", asyncHandler(scheduledTaskController.findAllByAssignment));

module.exports = router;