const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const semesterController = require("./semester.controller");
const moduleController = require("../modules/module.controller");
const assignmentController = require("../assignments/assignment.controller");

router.get("/", requireApiAuth, asyncHandler(semesterController.findAll));
router.post("/", requireApiAuth, asyncHandler(semesterController.create));
router.get("/:semesterId", requireApiAuth, asyncHandler(semesterController.findById));
router.patch("/:semesterId", requireApiAuth, asyncHandler(semesterController.update));
router.delete("/:semesterId", requireApiAuth, asyncHandler(semesterController.remove));

router.get("/:semesterId/modules", requireApiAuth, asyncHandler(moduleController.findAllBySemester));
router.post("/:semesterId/modules", requireApiAuth, asyncHandler(moduleController.createInSemester));

router.get("/:semesterId/assignments", requireApiAuth, asyncHandler(assignmentController.findAllBySemester));

module.exports = router;