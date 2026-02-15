const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const preferenceController = require("./preference.controller");

router.get("/", requireApiAuth, asyncHandler(preferenceController.getByUserId));
router.patch("/", requireApiAuth, asyncHandler(preferenceController.update));

module.exports = router;