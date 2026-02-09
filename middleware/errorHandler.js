module.exports = function errorHandler(err, req, res, next) {
	const statusCode = err.statusCode || 500;

	if (res.headersSent) return next(err);

	return res.status(statusCode).json({
		statusCode,
		message: err.message
	});
};
