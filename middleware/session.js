const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

function createSessionMiddleware(dbPool) {
	const store = new MySQLStore(
	{
		clearExpired: true,
		checkExpirationInterval: 60 * 1000,
		expiration: 7 * 24 * 60 * 60 * 1000, // 7 days
	},
	dbPool
	);

	return session({
		name: "gradus.sid",
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		store,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
			secure: false, // true in prod
			maxAge: 7 * 24 * 60 * 60 * 1000,
		}
	});
}

module.exports = createSessionMiddleware;