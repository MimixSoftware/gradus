const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const scheduledTaskController = require("./scheduledTask.controller");

router.get("/", requireApiAuth, asyncHandler(scheduledTaskController.findAll));
router.get("/:scheduledTaskId", requireApiAuth, asyncHandler(scheduledTaskController.findById));
router.patch("/:scheduledTaskId", requireApiAuth, asyncHandler(scheduledTaskController.update));
router.delete("/:scheduledTaskId", requireApiAuth, asyncHandler(scheduledTaskController.remove));

router.post("/auto", requireApiAuth, asyncHandler(scheduledTaskController.createMany));

module.exports = router;