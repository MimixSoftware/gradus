const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const assignmentController = require("./assignment.controller");

router.get("/", requireApiAuth, asyncHandler(assignmentController.findAll));
router.get("/:moduleId", requireApiAuth, asyncHandler(assignmentController.findById));
router.patch("/:moduleId", requireApiAuth, asyncHandler(assignmentController.update));
router.delete("/:moduleId", requireApiAuth, asyncHandler(assignmentController.remove));

module.exports = router;