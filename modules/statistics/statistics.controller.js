const { validateRequiredInt } = require("../../utils/validationUtils");

const statisticsService = require("./statistics.service");

async function getStatistics(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const statistics = await statisticsService.getStatistics(req.user.id, semesterId);

	return res.status(200).json({ statistics });
}

module.exports = { getStatistics };