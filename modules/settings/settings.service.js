const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapUserSettingsRow(us) {
	return {
		activeSemesterId: us.active_semester_id,
		theme: us.theme
	};
}

async function getByUserId(userId) {
	const [rows] = await db.query(
		`SELECT
			us.user_id,
			us.active_semester_id,
			us.theme,
			us.created_at,
			us.updated_at
		FROM user_settings us
		WHERE us.user_id = ?
		LIMIT 1`,
		[userId]
	);

	if (rows.length === 0) {
		throw new AppError("Settings not found.", 404);
	}

	return mapUserSettingsRow(rows[0]);
}

async function update(userId, { activeSemesterId, theme }) {
	const setParts = [];
	const values = [];

	if (activeSemesterId !== undefined && activeSemesterId !== null) {
		const [semRows] = await db.query(
			`SELECT 1 FROM semesters WHERE id = ? AND user_id = ? LIMIT 1`,
			[activeSemesterId, userId]
		);

		if (semRows.length === 0) {
			throw new AppError("Semester not found.", 404);
		}
	}

	if (activeSemesterId  !== undefined) {
		setParts.push("us.active_semester_id = ?");
		values.push(activeSemesterId);
	}

	if (theme !== undefined) {
		setParts.push("us.theme = ?");
		values.push(theme);
	}

	values.push(userId);

	try {
		const [result] = await db.query(
			`UPDATE user_settings us
			SET ${setParts.join(", ")}
			WHERE user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Settings not found.", 404);
		}

		return await getByUserId(userId);
	} catch (err) {
		if (err.code === "ER_NO_REFERENCED_ROW_2") {
			throw new AppError("Semester not found.", 404);
		}
		throw err;
	}
}

module.exports = { getByUserId, update };