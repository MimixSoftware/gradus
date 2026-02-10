module.exports = function attachUser(req, res, next) {
	res.locals.user = req.session?.user ?? null;
	next();
};