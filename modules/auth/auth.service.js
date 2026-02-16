const bcrypt = require("bcrypt");

const db = require("../../database/db");
const AppError = require('../../utils/AppError');

const settingsService = require("../settings/settings.service");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);

async function register({ email, forename, surname, password }) {
	const connection = await db.getConnection();
	try {
		await connection.beginTransaction();

		const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

		const [userResult] = await connection.query(
			`INSERT INTO users (email, forename, surname, password_hash, last_login_at)
			 VALUES (?, ?, ?, ?, NOW())`,
			[email, forename, surname, password_hash]
		);
		const userId = userResult.insertId;

		await connection.query(
			`INSERT INTO user_settings (user_id, active_semester_id, theme)
			 VALUES (?, ?, ?)`,
			[userId, null, "light"]
		);

		await connection.commit();

		const settings = await settingsService.getByUserId(userId);

		return {
			user: {
				id: userId,
				email,
				forename,
				surname,
				role: "user",
				status: "active"
			},
			settings
		};
	} catch (err) {
		await connection.rollback();

		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Email already in use.", 409);
		}
		throw err;
	} finally {
		connection.release();
	}
}

async function login({ email, password }) {
	const [rows] = await db.query(
		`SELECT id, email, forename, surname, password_hash, role, status
		FROM users
		WHERE email = ?
		LIMIT 1`,
		[email]
	);

	if (rows.length === 0) {
		throw new AppError("Invalid email or password.", 401);
	}

	const user = rows[0];

	if (user.status !== "active") {
		throw new AppError("Account suspended.", 403);
	}

	const ok = await bcrypt.compare(password, user.password_hash);

	if (!ok) {
		throw new AppError("Invalid email or password.", 401);
	}

	await db.query(
		`UPDATE users 
		SET last_login_at = NOW() 
		WHERE id = ?`,
		[user.id]
	);

	const settings = await settingsService.getByUserId(user.id);

	return {
		user: {
			id: user.id,
			email: user.email,
			forename: user.forename,
			surname: user.surname,
			role: user.role,
			status: user.status
		},
		settings
	};
}

module.exports = { register, login };