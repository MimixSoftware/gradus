const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapPreferenceRow(p) {
	return {
		activeSemesterId: p.active_semester_id,
		theme: p.theme
	};
}

async function getByUserId(userId) {
	const [rows] = await db.query(
		`SELECT
			p.user_id,
			p.active_semester_id,
			p.theme,
			p.created_at,
			p.updated_at
		FROM preferences p
		WHERE p.user_id = ?
		LIMIT 1`,
		[userId]
	);

	if (rows.length === 0) {
		throw new AppError("Preferences not found.", 404);
	}

	return mapPreferenceRow(rows[0]);
}

async function update(userId, { activeSemesterId, theme }) {
	const setParts = [];
	const values = [];

	if (activeSemesterId  !== undefined) {
		setParts.push("p.active_semester_id = ?");
		values.push(activeSemesterId);
	}

	if (theme !== undefined) {
		setParts.push("p.theme = ?");
		values.push(theme);
	}

	values.push(userId);

	try {
		const [result] = await db.query(
			`UPDATE user_preferences
			SET ${setParts.join(", ")}
			WHERE user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Preferences not found.", 404);
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