const express = require("express");
const router = express.Router();

const asyncHandler = require('../../utils/asyncHandler');
const authController = require("./auth.controller");

router.post("/register/start", asyncHandler(authController.startRegistration));
router.post("/register/complete", asyncHandler(authController.completeRegistration));
router.post("/register/resend", asyncHandler(authController.resendRegistrationCode));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authController.logout);

module.exports = router;