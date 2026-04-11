function requireAuth(req, res, next) {
	if (req.user) return next();
	return res.redirect("/");
}

function redirectIfAuth(req, res, next) {
	if (req.user) return res.redirect("/dashboard");
	return next();
}

function requireApiAuth(req, res, next) {
	if (req.user) return next();

	return res.status(401).json({
		message: "Unauthorised."
	});
}

module.exports = { requireAuth, redirectIfAuth, requireApiAuth };