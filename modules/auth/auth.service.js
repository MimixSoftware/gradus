const bcrypt = require("bcrypt");

const db = require("../../db");
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);

async function register({ email, forename, surname, password }) {
	const [existing] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

	if (existing.length > 0) {
		throw new AppError("Email already in use.", 409);
	}

	const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

	const [result] = await db.query(
		`INSERT INTO users (email, forename, surname, password_hash)
		VALUES (?, ?, ?, ?)`,
		[email, forename, surname, password_hash]
	);

	return {
		id: result.insertId,
		email,
		forename,
		surname,
		role: "user"
	};
}

async function login({ email, password }) {
	const [rows] = await db.query(
		`SELECT id, email, forename, surname, password_hash, role
		FROM users
		WHERE email = ?
		LIMIT 1`,
		[email]
	);

	if (rows.length === 0) {
		throw new AppError("Invalid email or password.", 401);
	}

	const user = rows[0];
	const ok = await bcrypt.compare(password, user.password_hash);

	if (!ok) {
		throw new AppError("Invalid email or password.", 401);
	}

	return {
		id: user.id,
		email: user.email,
		forename: user.forename,
		surname: user.surname,
		role: user.role
	};
}

async function getUserById(id) {
	const [rows] = await db.query(
		`SELECT id, email, forename, surname
		FROM users
		WHERE id = ?
		LIMIT 1`,
		[id]
	);

	if (rows.length === 0) {
		throw new AppError("User not found.", 404);
	}

	return rows[0];
}

module.exports = { register, login, getUserById };