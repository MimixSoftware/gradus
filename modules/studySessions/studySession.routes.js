const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const studySessionController = require("./studySession.controller");

router.get("/", requireApiAuth, asyncHandler(studySessionController.findAll));
router.get("/:studySessionId", requireApiAuth, asyncHandler(studySessionController.findById));
router.patch("/:studySessionId", requireApiAuth, asyncHandler(studySessionController.update));
router.delete("/:studySessionId", requireApiAuth, asyncHandler(studySessionController.remove));

module.exports = router;