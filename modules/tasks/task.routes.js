const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const taskController = require("./task.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/", asyncHandler(taskController.findAll));
router.get("/:taskId", asyncHandler(taskController.findById));
router.patch("/:taskId", asyncHandler(taskController.update));
router.delete("/:taskId", asyncHandler(taskController.remove));

router.post("/estimate", asyncHandler(taskController.estimate));

module.exports = router;