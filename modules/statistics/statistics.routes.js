const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../../middleware/authGuards");
const { rateLimiter } = require("../../middleware/rateLimiter");
const asyncHandler = require('../../utils/asyncHandler');
const statisticsController = require("./statistics.controller");

router.use(requireApiAuth);
router.use(rateLimiter);

router.get("/:semesterId", asyncHandler(statisticsController.getStatistics));

module.exports = router;