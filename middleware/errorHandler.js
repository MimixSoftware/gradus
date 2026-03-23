const multer = require("multer");

module.exports = function errorHandler(err, req, res, next) {
	let statusCode = err.statusCode || 500;

	if (err instanceof multer.MulterError) {
		statusCode = 400;

		let message = "File upload failed.";

		if (err.code === "LIMIT_FILE_SIZE") {
			message = "Avatar image must be 2 MB or smaller.";
		} else if (err.code === "LIMIT_UNEXPECTED_FILE") {
			message = "Unexpected file field.";
		} else if (err.code === "MISSING_FIELD_NAME") {
			message = "Upload field name is missing.";
		} else if (err.message) {
			message = err.message;
		}

		err = {
			message,
			stack: err.stack,
			statusCode
		};
	}

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
