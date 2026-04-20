const bcrypt = require("bcrypt");
const crypto = require("crypto");

const db = require("../../database/db");
const AppError = require('../../utils/AppError');

const settingsService = require("../settings/settings.service");
const emailService = require("../../utils/emailService");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);
const VERIFICATION_CODE_EXPIRATION_MINUTES = Number(process.env.VERIFICATION_CODE_EXPIRATION_MINUTES);
const RESET_TOKEN_EXPIRATION_MINUTES = Number(process.env.RESET_TOKEN_EXPIRATION_MINUTES);
const MAX_VERIFICATION_ATTEMPTS = Number(process.env.MAX_VERIFICATION_ATTEMPTS);
const RESEND_COOLDOWN_SECONDS = Number(process.env.RESEND_COOLDOWN_SECONDS);
const MAX_RESEND_COUNT = Number(process.env.MAX_RESEND_COUNT);
const RESEND_LOCK_HOURS = Number(process.env.RESEND_LOCK_HOURS);
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS);
const LOGIN_COOLDOWN_SECONDS = Number(process.env.LOGIN_COOLDOWN_SECONDS);

function generateVerificationCode() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

function generateResetToken() {
	return crypto.randomBytes(32).toString("hex");
}

async function findPendingRegistrationByEmail(connection, email) {
	const [rows] = await connection.query(
		`SELECT id, email, forename, surname, password_hash, verification_code_hash, code_expires_at, verification_attempts, resend_count, last_code_sent_at, created_at, updated_at
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
			status: "active",
			onboarded: false,
			tutorialCompleted: false
		}
	};
}

function enforceCooldown(lastSentAt) {
	const now = new Date();
	const lastSent = new Date(lastSentAt);
	const seconds = (now - lastSent) / 1000;

	if (seconds < RESEND_COOLDOWN_SECONDS) {
		throw new AppError(`Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - seconds)} seconds before requesting a new code.`, 429);
	}
}

async function enforcePendingRegistrationResendLimit(connection, pending) {
	const now = new Date();

	if (pending.resend_count >= MAX_RESEND_COUNT) {
		const lastSent = new Date(pending.last_code_sent_at);
		const hoursSinceLastSend = (now - lastSent) / (1000 * 60 * 60);

		if (hoursSinceLastSend < RESEND_LOCK_HOURS) {
			throw new AppError("Too many resend attempts. Please try again later.", 429);
		} else {
			await connection.query(
				`UPDATE pending_registrations
				SET resend_count = 0
				WHERE id = ?`,
				[pending.id]
			);

			pending.resend_count = 0;
		}
	}
}

async function enforcePasswordResetResendLimit(connection, existingReset) {
	const now = new Date();

	if (existingReset.resend_count >= MAX_RESEND_COUNT) {
		const lastSent = new Date(existingReset.last_token_sent_at);
		const hoursSinceLastSend = (now - lastSent) / (1000 * 60 * 60);

		if (hoursSinceLastSend < RESEND_LOCK_HOURS) {
			throw new AppError("Too many resend attempts. Please try again later.", 429);
		} else {
			await connection.query(
				`UPDATE password_resets
				SET resend_count = 0
				WHERE id = ?`,
				[pending.id]
			);

			existingReset.resend_count = 0;
		}
	}
}

async function findPasswordResetByUserId(connection, userId) {
	const [rows] = await connection.query(
		`SELECT user_id, reset_token_hash, token_expires_at, resend_count, last_token_sent_at, created_at, updated_at
		FROM password_resets
		WHERE user_id = ?
		LIMIT 1`,
		[userId]
	);

	return rows[0] ?? null;
}

async function startRegistration({ email, forename, surname, password }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		await ensureEmailNotRegistered(connection, email);

		const existingPending = await findPendingRegistrationByEmail(connection, email);

		if (existingPending) {
			enforceCooldown(existingPending.last_code_sent_at);

			await enforcePendingRegistrationResendLimit(connection, existingPending);
		}

		const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
		const verificationCode = generateVerificationCode();
		const verificationCodeHash = await bcrypt.hash(verificationCode, SALT_ROUNDS);

		if (existingPending) {
			await connection.query(
				`UPDATE pending_registrations
				 SET forename = ?,
					surname = ?,
					password_hash = ?,
					verification_code_hash = ?,
					code_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
					verification_attempts = 0,
					resend_count = resend_count + 1,
					last_code_sent_at = NOW()
				 WHERE email = ?`,
				[
					forename,
					surname || null,
					passwordHash,
					verificationCodeHash,
					VERIFICATION_CODE_EXPIRATION_MINUTES,
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
					verification_attempts,
					resend_count,
					last_code_sent_at
				)
				VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, ?, NOW())`,
				[
					email,
					forename,
					surname || null,
					passwordHash,
					verificationCodeHash,
					VERIFICATION_CODE_EXPIRATION_MINUTES,
					0,
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

		if (pending.verification_attempts >= MAX_VERIFICATION_ATTEMPTS) {
			throw new AppError("Too many attempts. Please request a new code.", 429);
		}

		if (new Date(pending.code_expires_at) < new Date()) {
			throw new AppError("Invalid or expired verification code.", 400);
		}

		const isCodeValid = await bcrypt.compare(code, pending.verification_code_hash);

		if (!isCodeValid) {
			await connection.query(
				`UPDATE pending_registrations
				SET verification_attempts = verification_attempts + 1
				WHERE id = ?`,
				[pending.id]
			);

			await connection.commit();
			throw new AppError("Invalid or expired verification code.", 400);
		}

		const result = await createUserFromPending(connection, pending);

		await connection.query(
			`DELETE FROM pending_registrations WHERE id = ?`,
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

		enforceCooldown(pending.last_code_sent_at);

		await enforcePendingRegistrationResendLimit(connection, pending);

		const verificationCode = generateVerificationCode();
		const verificationCodeHash = await bcrypt.hash(verificationCode, SALT_ROUNDS);

		await connection.query(
			`UPDATE pending_registrations
			SET verification_code_hash = ?,
				code_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
				verification_attempts = 0,
				resend_count = resend_count + 1,
				last_code_sent_at = NOW()
			WHERE id = ?`,
			[verificationCodeHash, VERIFICATION_CODE_EXPIRATION_MINUTES, pending.id]
		);

		await connection.commit();

		await emailService.sendVerificationCode(email, verificationCode, VERIFICATION_CODE_EXPIRATION_MINUTES);

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

async function login({ email, password }) {
	const [rows] = await db.query(
		`SELECT id, email, forename, surname, password_hash, role, status, onboarded, last_login_at, failed_login_attempts, last_failed_login_at
		FROM users
		WHERE email = ?
		LIMIT 1`,
		[email]
	);

	if (rows.length === 0) {
		throw new AppError("Invalid email or password.", 401);
	}

	const user = rows[0];

	const now = new Date();
	if (user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
		const lastFailed = new Date(user.last_failed_login_at)
		const seconds = (now - lastFailed) / 1000;
		
		if (seconds < LOGIN_COOLDOWN_SECONDS) {
			throw new AppError(
				`Too many failed login attempts. Try again in ${Math.ceil(LOGIN_COOLDOWN_SECONDS - seconds)} second${Math.ceil(LOGIN_COOLDOWN_SECONDS - seconds) === 1 ? "" : "s"}.`,
				429
			);
		}
	}

	const ok = await bcrypt.compare(password, user.password_hash);

	if (!ok) {
		await db.query(
			`UPDATE users 
				SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = NOW()
			WHERE id = ?`,
			[user.id]
		);

		throw new AppError("Invalid email or password.", 401);
	}

	if (user.status !== "active") {
		throw new AppError("Account suspended.", 403);
	}

	await db.query(
		`UPDATE users 
			SET failed_login_attempts = 0, last_failed_login_at = NULL, last_login_at = NOW()
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
			status: user.status,
			onboarded: Boolean(user.onboarded),
			tutorialCompleted: Boolean(user.tutorial_completed)
		},
		settings
	};
}

async function changePassword(userId, { currentPassword, newPassword }) {
	const [rows] = await db.query(
		`SELECT id, email, password_hash
		FROM users
		WHERE id = ?
		LIMIT 1`,
		[userId]
	);

	if (rows.length === 0) {
		throw new AppError("User not found.", 404);
	}

	const user = rows[0];

	const ok = await bcrypt.compare(currentPassword, user.password_hash);

	if (!ok) {
		throw new AppError("Current password is incorrect.", 401);
	}

	const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

	await db.query(
		`UPDATE users
		SET password_hash = ?
		WHERE id = ?`,
		[newPasswordHash, userId]
	);

	await emailService.sendPasswordChangedNotification(user.email);
}

async function startPasswordReset({ email }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		const [rows] = await connection.query(
			`SELECT id
			FROM users
			WHERE email = ?
			LIMIT 1`,
			[email]
		);

		if (rows.length === 0) {
			return;
		}

		const user = rows[0];

		const existingReset = await findPasswordResetByUserId(connection, user.id);

		if (existingReset) {
			enforceCooldown(existingReset.last_token_sent_at);

			await enforcePasswordResetResendLimit(connection, existingReset);
		}

		const resetToken = generateResetToken();
		const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

		if (existingReset) {
			await connection.query(
				`UPDATE password_resets
				 SET reset_token_hash = ?,
					token_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
					resend_count = resend_count + 1,
					last_token_sent_at = NOW()
				 WHERE user_id = ?`,
				[
					resetTokenHash,
					RESET_TOKEN_EXPIRATION_MINUTES,
					existingReset.user_id
				]
			);
		} else {
			await connection.query(
				`INSERT INTO password_resets (
					user_id,
					reset_token_hash,
					token_expires_at,
					resend_count,
					last_token_sent_at
				)
				VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, NOW())`,
				[
					user.id,
					resetTokenHash,
					RESET_TOKEN_EXPIRATION_MINUTES,
					0
				]
			);
		}

		await connection.commit();

		// await emailService.sendResetToken(email, resetToken, RESET_TOKEN_EXPIRATION_MINUTES);

		return {
			expiresInMinutes: RESET_TOKEN_EXPIRATION_MINUTES
		};
	} catch (err) {
		await connection.rollback();

		throw err;
	} finally {
		connection.release();
	}
}

async function isValidPasswordResetToken(resetToken) {
	const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

	const [rows] = await connection.query(
		`SELECT 1
		FROM password_resets
		WHERE reset_token_hash = ?
			AND token_expires_at > NOW()
		LIMIT 1`,
		[resetTokenHash]
	);

	return rows.length > 0;
}

async function completePasswordReset({ resetToken, newPassword }) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

		const [rows] = await connection.query(
			`SELECT user_id, token_expires_at
			FROM password_resets
			WHERE reset_token_hash = ?
			LIMIT 1`,
			[tokenHash]
		);

		const reset = rows[0];

		if (!reset) {
			throw new AppError("Invalid or expired password reset token.", 400);
		}

		if (new Date(reset.token_expires_at) < new Date()) {
			throw new AppError("Invalid or expired password reset token.", 400);
		}

		const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

		await connection.query(
			`UPDATE users
			SET password_hash = ?
			WHERE id = ?`,
			[passwordHash, reset.user_id]
		);

		await connection.query(
			`DELETE FROM password_resets
			WHERE user_id = ?`,
			[reset.user_id]
		);

		await connection.commit();
	} catch (err) {
		await connection.rollback();

		throw err;
	} finally {
		connection.release();
	}
}

module.exports = { startRegistration, completeRegistration, resendRegistrationCode, login, changePassword, startPasswordReset, isValidPasswordResetToken, completePasswordReset };