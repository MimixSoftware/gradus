const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const moduleController = require("./module.controller");
const assignmentController = require("../assignments/assignment.controller");

router.get("/", requireApiAuth, asyncHandler(moduleController.findAll));
router.get("/:moduleId", requireApiAuth, asyncHandler(moduleController.findById));
router.patch("/:moduleId", requireApiAuth, asyncHandler(moduleController.update));
router.delete("/:moduleId", requireApiAuth, asyncHandler(moduleController.remove));

router.get("/:moduleId/assignments", requireApiAuth, asyncHandler(assignmentController.findAllByModule));
router.post("/:moduleId/assignments", requireApiAuth, asyncHandler(assignmentController.createInModule));

module.exports = router;