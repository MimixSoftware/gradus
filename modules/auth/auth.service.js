const bcrypt = require("bcrypt");

const db = require("../../database/db");
const AppError = require('../../utils/AppError');

const settingsService = require("../settings/settings.service");
const emailService = require("../../utils/emailService");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);
const VERIFICATION_CODE_EXPIRATION_MINUTES = 1;
const MAX_VERIFICATION_ATTEMPTS = Number(process.env.MAX_VERIFICATION_ATTEMPTS);

function generateVerificationCode() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

function getCodeExpiryDate() {
	const expiresAt = new Date();
	expiresAt.setMinutes(expiresAt.getMinutes() + VERIFICATION_CODE_EXPIRATION_MINUTES);
	return expiresAt;
}

async function findPendingRegistrationByEmail(connection, email) {
	const [rows] = await connection.query(
		`SELECT id, email, forename, surname, password_hash, verification_code_hash, code_expires_at, attempts, created_at, updated_at
		FROM pending_registrations
		WHERE email = ?
		LIMIT 1`,
		[email]
	);

	return rows[0] ?? null;
}

async function ensureEmailNotRegistered(connection, email) {
	const [rows] = await connection.query(
		`SELECT id
		 FROM users
		 WHERE email = ?
		 LIMIT 1`,
		[email]
	);

	if (rows.length > 0) {
		throw new AppError("Email already in use.", 409);
	}
}

async function createUserFromPending(connection, pending) {
	const [userResult] = await connection.query(
		`INSERT INTO users (email, forename, surname, password_hash, last_login_at)
		VALUES (?, ?, ?, ?, NOW())`,
		[pending.email, pending.forename, pending.surname, pending.password_hash]
	);

	const userId = userResult.insertId;

	await connection.query(
		`INSERT INTO user_settings (user_id, active_semester_id, theme)
		VALUES (?, ?, ?)`,
		[userId, null, "system"]
	);

	return {
		user: {
			id: userId,
			email: pending.email,
			forename: pending.forename,
			surname: pending.surname,
			role: "user",
			status: "active"
		}
	};
}

async function startRegistration({ email, forename, surname, password }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		await ensureEmailNotRegistered(connection, email);

		const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
		const verificationCode = generateVerificationCode();
		const verificationCodeHash = await bcrypt.hash(verificationCode, SALT_ROUNDS);
		const codeExpiresAt = getCodeExpiryDate();

		const existingPending = await findPendingRegistrationByEmail(connection, email);

		if (existingPending) {
			await connection.query(
				`UPDATE pending_registrations
				SET forename = ?,
					surname = ?,
					password_hash = ?,
					verification_code_hash = ?,
					code_expires_at = ?,
					attempts = 0
				WHERE email = ?`,
				[
					forename,
					surname || null,
					passwordHash,
					verificationCodeHash,
					codeExpiresAt,
					email
				]
			);
		} else {
			await connection.query(
				`INSERT INTO pending_registrations (
					email,
					forename,
					surname,
					password_hash,
					verification_code_hash,
					code_expires_at,
					attempts
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					email,
					forename,
					surname || null,
					passwordHash,
					verificationCodeHash,
					codeExpiresAt,
					0
				]
			);
		}

		await connection.commit();

		await emailService.sendVerificationCode(email, verificationCode, VERIFICATION_CODE_EXPIRATION_MINUTES);

		return {
			email,
			expiresInMinutes: VERIFICATION_CODE_EXPIRATION_MINUTES
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

async function completeRegistration({ email, code }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		await ensureEmailNotRegistered(connection, email);

		const pending = await findPendingRegistrationByEmail(connection, email);

		if (!pending) {
			throw new AppError("No pending registration found for this email.", 404);
		}

		if (pending.attempts >= MAX_VERIFICATION_ATTEMPTS) {
			throw new AppError("Too many incorrect verification attempts. Please request a new code.", 429);
		}

		const now = new Date();
		if (new Date(pending.code_expires_at) < now) {
			throw new AppError("Verification code expired. Please request a new code.", 400);
		}

		const isCodeValid = await bcrypt.compare(code, pending.verification_code_hash);

		if (!isCodeValid) {
			await connection.query(
				`UPDATE pending_registrations
				SET attempts = attempts + 1
				WHERE id = ?`,
				[pending.id]
			);

			throw new AppError("Invalid verification code.", 400);
		}

		const result = await createUserFromPending(connection, pending);

		await connection.query(
			`DELETE FROM pending_registrations
			WHERE id = ?`,
			[pending.id]
		);

		await connection.commit();

		const settings = await settingsService.getByUserId(result.user.id);

		return {
			user: result.user,
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

async function resendRegistrationCode({ email }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		await ensureEmailNotRegistered(connection, email);

		const pending = await findPendingRegistrationByEmail(connection, email);

		if (!pending) {
			throw new AppError("No pending registration found for this email.", 404);
		}

		const verificationCode = generateVerificationCode();
		const verificationCodeHash = await bcrypt.hash(verificationCode, SALT_ROUNDS);
		const codeExpiresAt = getCodeExpiryDate();

		await connection.query(
			`UPDATE pending_registrations
			SET verification_code_hash = ?,
				code_expires_at = ?,
				attempts = 0
			WHERE id = ?`,
			[verificationCodeHash, codeExpiresAt, pending.id]
		);

		await connection.commit();

		await emailService.sendVerificationCode(email, verificationCode);

		return {
			email,
			expiresInMinutes: VERIFICATION_CODE_EXPIRATION_MINUTES
		};
	} catch (err) {
		await connection.rollback();
		throw err;
	} finally {
		connection.release();
	}
}

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
			[userId, null, "system"]
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

module.exports = { startRegistration, completeRegistration, resendRegistrationCode, login };