const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const scheduledTaskController = require("./scheduledTask.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/", asyncHandler(scheduledTaskController.findAll));
router.get("/:scheduledTaskId", asyncHandler(scheduledTaskController.findById));
router.patch("/:scheduledTaskId", asyncHandler(scheduledTaskController.update));
router.delete("/:scheduledTaskId", asyncHandler(scheduledTaskController.remove));

router.post("/auto", asyncHandler(scheduledTaskController.createMany));

module.exports = router;