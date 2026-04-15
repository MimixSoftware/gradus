const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');
const avatarUpload = require("../../middleware/avatarUpload");

const settingsController = require("./settings.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/", asyncHandler(settingsController.getByUserId));
router.patch("/", asyncHandler(settingsController.update));
router.get("/avatar", asyncHandler(settingsController.getAvatar));
router.patch("/avatar", avatarUpload.single("avatar"), asyncHandler(settingsController.updateAvatar));
router.delete("/avatar", asyncHandler(settingsController.deleteAvatar));
router.get("/onboarding", asyncHandler(settingsController.getOnboardingStatus));
router.post("/onboarding", asyncHandler(settingsController.completeOnboarding));

module.exports = router;