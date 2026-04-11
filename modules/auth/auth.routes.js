const express = require("express");
const router = express.Router();

const { authRateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');
const authController = require("./auth.controller");

router.post("/register/start", authRateLimiter, asyncHandler(authController.startRegistration));
router.post("/register/complete", authRateLimiter, asyncHandler(authController.completeRegistration));
router.post("/register/resend", authRateLimiter, asyncHandler(authController.resendRegistrationCode));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.post("/logout", authController.logout);

module.exports = router;