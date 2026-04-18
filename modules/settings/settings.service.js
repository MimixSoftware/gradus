const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const db = require("../../database/db");
const AppError = require("../../utils/AppError");

const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");
const DEFAULT_AVATAR_PATH = path.join(process.cwd(), "storage", "avatars", "0.webp");

function mapUserSettingsRow(row) {
	return {
		forename: row.forename,
		surname: row.surname,
		onboarded: Boolean(row.onboarded),
		tutorialCompleted: Boolean(row.tutorial_completed),
		activeSemesterId: row.active_semester_id,
		theme: row.theme
	};
}

function mapUserWithSettings(row) {
	return {
		user: {
			id: row.id,
			email: row.email,
			forename: row.forename,
			surname: row.surname,
			role: row.role,
			status: row.status,
			onboarded: Boolean(row.onboarded),
			tutorialCompleted: Boolean(row.tutorial_completed)
		},
		settings: {
			forename: row.forename,
			surname: row.surname,
			onboarded: Boolean(row.onboarded),
			tutorialCompleted: Boolean(row.tutorial_completed),
			activeSemesterId: row.active_semester_id,
			theme: row.theme
		}
	};
}

async function getByUserId(userId) {
	const [rows] = await db.query(
		`SELECT
			u.forename,
			u.surname,
			u.onboarded,
			u.tutorial_completed,
			us.active_semester_id,
			us.theme
		FROM users u
		INNER JOIN user_settings us ON us.user_id = u.id
		WHERE u.id = ?
		LIMIT 1`,
		[userId]
	);

	if (rows.length === 0) {
		throw new AppError("Settings not found.", 404);
	}

	return mapUserSettingsRow(rows[0]);
}

async function getUserWithSettingsById(userId) {
	const [rows] = await db.query(
		`SELECT
			u.id,
			u.email,
			u.forename,
			u.surname,
			u.role,
			u.status,
			u.onboarded,
			u.tutorial_completed,
			us.active_semester_id,
			us.theme
		FROM users u
		INNER JOIN user_settings us ON us.user_id = u.id
		WHERE u.id = ?
		LIMIT 1`,
		[userId]
	);

	if (rows.length === 0) {
		throw new AppError("Settings not found.", 404);
	}

	return mapUserWithSettings(rows[0]);
}

async function getAvatarPath(userId) {
	const avatarPath = path.join(AVATAR_DIR, `${userId}.webp`);

	try {
		await fs.access(avatarPath);
		return avatarPath;
	} catch {
		return DEFAULT_AVATAR_PATH;
	}
}

async function updateUserFields(conn, userId, { forename, surname }) {
	const setParts = [];
	const values = [];

	if (forename !== undefined) {
		setParts.push("forename = ?");
		values.push(forename);
	}

	if (surname !== undefined) {
		setParts.push("surname = ?");
		values.push(surname);
	}

	if (!setParts.length) return;

	values.push(userId);

	const [result] = await conn.query(
		`UPDATE users
		SET ${setParts.join(", ")}
		WHERE id = ?`,
		values
	);

	if (result.affectedRows === 0) {
		throw new AppError("User not found.", 404);
	}
}

async function updateUserSettingsFields(conn, userId, { activeSemesterId, theme }) {
	const setParts = [];
	const values = [];

	if (activeSemesterId !== undefined && activeSemesterId !== null) {
		const [semRows] = await conn.query(
			`SELECT 1
			FROM semesters
			WHERE id = ? AND user_id = ?
			LIMIT 1`,
			[activeSemesterId, userId]
		);

		if (semRows.length === 0) {
			throw new AppError("Semester not found.", 404);
		}
	}

	if (activeSemesterId !== undefined) {
		setParts.push("active_semester_id = ?");
		values.push(activeSemesterId);
	}

	if (theme !== undefined) {
		setParts.push("theme = ?");
		values.push(theme);
	}

	if (!setParts.length) return;

	values.push(userId);

	const [result] = await conn.query(
		`UPDATE user_settings
		SET ${setParts.join(", ")}
		WHERE user_id = ?`,
		values
	);

	if (result.affectedRows === 0) {
		throw new AppError("Settings not found.", 404);
	}
}

async function update(userId, payload) {
	const conn = await db.getConnection();

	try {
		await conn.beginTransaction();

		await updateUserFields(conn, userId, payload);
		await updateUserSettingsFields(conn, userId, payload);

		await conn.commit();

		return await getUserWithSettingsById(userId);
	} catch (err) {
		await conn.rollback();

		if (err.code === "ER_NO_REFERENCED_ROW_2") {
			throw new AppError("Semester not found.", 404);
		}

		throw err;
	} finally {
		conn.release();
	}
}

async function updateAvatar(userId, file) {
	if (!file) {
		throw new AppError("No avatar file uploaded.", 400);
	}

	await fs.mkdir(AVATAR_DIR, { recursive: true });

	const outputPath = path.join(AVATAR_DIR, `${userId}.webp`);

	try {
		await sharp(file.buffer)
			.resize(256, 256, { fit: "cover", position: "centre" })
			.webp({ quality: 82 })
			.toFile(outputPath);
	} catch {
		throw new AppError("Failed to process avatar image.", 400);
	}
}

async function deleteAvatar(userId) {
	const avatarPath = path.join(AVATAR_DIR, `${userId}.webp`);

	try {
		await fs.unlink(avatarPath);
	} catch (err) {
		if (err.code === "ENOENT") {
			return;
		}
		throw err;
	}
}

async function completeOnboarding(userId) {
	const [semesters] = await db.query(
		`SELECT id FROM semesters WHERE user_id = ? LIMIT 1`,
		[userId]
	);
	if (semesters.length === 0) {
		throw new AppError("You must create at least one semester before completing onboarding.", 400);
	}

	const [sessions] = await db.query(
		`SELECT ss.id
		FROM study_sessions ss
		JOIN semesters s ON ss.semester_id = s.id
		WHERE s.user_id = ?
		LIMIT 1`,
		[userId]
	);
	if (sessions.length === 0) {
		throw new AppError("You must create at least one study session before completing onboarding.", 400);
	}

	const [result] = await db.query(
		`UPDATE users
		SET onboarded = TRUE
		WHERE id = ?`,
		[userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("User not found.", 404);
	}

	return await getUserWithSettingsById(userId);
}

async function completeTutorial(userId) {
	const [result] = await db.query(
		`UPDATE users
		SET tutorial_completed = TRUE
		WHERE id = ?`,
		[userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("User not found.", 404);
	}

	return await getUserWithSettingsById(userId);
}

module.exports = { getByUserId, getAvatarPath, update, updateAvatar, deleteAvatar, completeOnboarding, completeTutorial };