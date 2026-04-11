const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');

const moduleController = require("./module.controller");
const assignmentController = require("../assignments/assignment.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/", asyncHandler(moduleController.findAll));
router.get("/:moduleId", asyncHandler(moduleController.findById));
router.patch("/:moduleId", asyncHandler(moduleController.update));
router.delete("/:moduleId", asyncHandler(moduleController.remove));

router.get("/:moduleId/assignments", asyncHandler(assignmentController.findAllByModule));
router.post("/:moduleId/assignments", asyncHandler(assignmentController.createInModule));

module.exports = router;