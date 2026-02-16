module.exports = function errorHandler(err, req, res, next) {
	const statusCode = err.statusCode || 500;

	req._error = {
		message: err.message,
		stack: err.stack
	};

	if (res.headersSent) return next(err);

	const isApi = req.originalUrl.startsWith("/api");
	if (isApi) {
		return res.status(statusCode).json({ message: statusCode === 500 ? "Internal server error." : err.message });
	}
	
	res.status(statusCode).render('error', { 
		title: 'Error',
		statusCode,
		message: statusCode === 500 ? "Something went wrong on our side. Please try again later." : err.message,
		showHomeButton: true
	});
};
