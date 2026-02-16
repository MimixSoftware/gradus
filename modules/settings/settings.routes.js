const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const settingsController = require("./settings.controller");

router.get("/", requireApiAuth, asyncHandler(settingsController.getByUserId));
router.patch("/", requireApiAuth, asyncHandler(settingsController.update));

module.exports = router;