module.exports = function attachUser(req, res, next) {
	const user = req.session?.user ?? null;
	const settings = req.session?.settings ?? null;

	req.user = user;
	req.settings = settings;

	res.locals.user = user;
	res.locals.settings = settings;

	next();
};