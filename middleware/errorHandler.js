module.exports = function errorHandler(err, req, res, next) {
	const statusCode = err.statusCode || 500;

	req._error = {
		message: err.message
	};

	if (res.headersSent) return next(err);

	return res.status(statusCode).json({
		statusCode,
		message: statusCode === 500 ? "Internal server error." : err.message
	});
};
