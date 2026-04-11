const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const studySessionController = require("./studySession.controller");
const scheduledTaskController = require("../scheduledTasks/scheduledTask.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/aggregate", asyncHandler(studySessionController.getAggregate));

router.get("/", asyncHandler(studySessionController.findAll));
router.get("/:studySessionId", asyncHandler(studySessionController.findById));
router.patch("/:studySessionId", asyncHandler(studySessionController.update));
router.delete("/:studySessionId", asyncHandler(studySessionController.remove));

router.get("/:studySessionId/scheduled-tasks", asyncHandler(scheduledTaskController.findAllByStudySession));
router.post("/:studySessionId/scheduled-tasks", asyncHandler(scheduledTaskController.createInStudySession));

module.exports = router;