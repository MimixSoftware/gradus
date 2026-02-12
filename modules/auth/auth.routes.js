const express = require("express");
const router = express.Router();

const asyncHandler = require('../../utils/asyncHandler');
const authController = require("./auth.controller");

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authController.logout);

module.exports = router;