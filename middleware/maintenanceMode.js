module.exports = (req, res, next) => {
	if (process.env.MAINTENANCE_MODE === 'true') {
		res.status(503);
		res.render('error', { title: 'Error', statusCode: '503', message: 'This website is currently under maintenance. Please try again later.', showHomeButton: false});
	}
	else {
		next();
	}
};