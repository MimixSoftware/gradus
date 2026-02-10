module.exports = function attachUser(req, res, next) {
	const user = req.session?.user ?? null;
	req.user = user;
	res.locals.user = user;
	next();
};