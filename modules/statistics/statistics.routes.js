const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const asyncHandler = require('../../utils/asyncHandler');
const statisticsController = require("./statistics.controller");

router.get("/:semesterId", requireApiAuth, asyncHandler(statisticsController.getStatistics));

module.exports = router;