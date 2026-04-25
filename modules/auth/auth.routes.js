const express = require("express");
const router = express.Router();

const { authRateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');
const authController = require("./auth.controller");

router.post("/register/start", authRateLimiter, asyncHandler(authController.startRegistration));
router.post("/register/complete", authRateLimiter, asyncHandler(authController.completeRegistration));
router.post("/register/resend", authRateLimiter, asyncHandler(authController.resendRegistrationCode));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.post("/change-password", authRateLimiter, asyncHandler(authController.changePassword));
router.post("/password-reset/start", authRateLimiter, asyncHandler(authController.startPasswordReset));
router.post("/password-reset/complete", authRateLimiter, asyncHandler(authController.completePasswordReset));
router.post("/logout", authController.logout);
router.post("/delete-account", authRateLimiter, asyncHandler(authController.deleteAccount));

module.exports = router;