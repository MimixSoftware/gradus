const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const moduleController = require("./module.controller");

router.get("/", requireApiAuth, asyncHandler(moduleController.findAll));
router.get("/:moduleId", requireApiAuth, asyncHandler(moduleController.findById));
router.patch("/:moduleId", requireApiAuth, asyncHandler(moduleController.update));
router.delete("/:moduleId", requireApiAuth, asyncHandler(moduleController.remove));

module.exports = router;