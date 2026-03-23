const db = require("../../database/db");
const AppError = require("../../utils/AppError");

function mapUserSettingsRow(row) {
	return {
		forename: row.forename,
		surname: row.surname,
		activeSemesterId: row.active_semester_id,
		theme: row.theme
	};
}

async function getByUserId(userId) {
	const [rows] = await db.query(
		`SELECT
			u.forename,
			u.surname,
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

		return await getByUserId(userId);
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

module.exports = { getByUserId, update };