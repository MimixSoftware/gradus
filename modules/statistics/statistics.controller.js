const statisticsService = require("./statistics.service");
const { validateRequiredInt } = require("../../utils/validationUtils");

async function getStatistics(req, res) {
	const semesterId = validateRequiredInt(req.params.semesterId, "Semester ID", { min: 1 });

	const statistics = await statisticsService.getStatistics(req.user.id, semesterId);

	return res.status(200).json({ statistics });
}

module.exports = { getStatistics };