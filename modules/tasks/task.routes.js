const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const taskController = require("./task.controller");

router.get("/", requireApiAuth, asyncHandler(taskController.findAll));
router.get("/:taskId", requireApiAuth, asyncHandler(taskController.findById));
router.patch("/:taskId", requireApiAuth, asyncHandler(taskController.update));
router.delete("/:taskId", requireApiAuth, asyncHandler(taskController.remove));

module.exports = router;