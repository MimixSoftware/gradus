module.exports = function attachUser(req, res, next) {
	const user = req.session?.user ?? null;
	const preferences = req.session?.preferences ?? null;

	req.user = user;
	req.preferences = preferences;

	res.locals.user = user;
	res.locals.preferences = preferences;

	next();
};