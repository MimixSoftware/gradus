const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const avatarUpload = require("../../middleware/avatarUpload");
const settingsController = require("./settings.controller");

router.get("/", requireApiAuth, asyncHandler(settingsController.getByUserId));
router.patch("/", requireApiAuth, asyncHandler(settingsController.update));
router.get("/avatar", requireApiAuth, asyncHandler(settingsController.getAvatar));
router.patch("/avatar", requireApiAuth, avatarUpload.single("avatar"), asyncHandler(settingsController.updateAvatar));
router.delete("/avatar", requireApiAuth, asyncHandler(settingsController.deleteAvatar));

module.exports = router;