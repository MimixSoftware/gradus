function requireAuth(req, res, next) {
	if (req.session?.user) return next();
	return res.redirect("/");
}

function redirectIfAuth(req, res, next) {
	if (req.session?.user) return res.redirect("/dashboard");
	return next();
}

module.exports = { requireAuth, redirectIfAuth };