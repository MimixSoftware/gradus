const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const assignmentController = require("./assignment.controller");

router.get("/", requireApiAuth, asyncHandler(assignmentController.findAll));
router.get("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.findById));
router.patch("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.update));
router.delete("/:assignmentId", requireApiAuth, asyncHandler(assignmentController.remove));

module.exports = router;