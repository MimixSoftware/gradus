const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapSemesterRow(s) {
	return {
		id: s.id,
		userId: s.user_id,
		name: s.name,
		startDate: s.start_date,
		endDate: s.end_date,
		createdAt: s.created_at,
		updatedAt: s.updated_at
	};
}

async function overlapCheck(userId, startDate, endDate, { excludeSemesterId = null } = {}) {
	const params = [userId, endDate, startDate];

	let sql = `
		SELECT 1
		FROM semesters
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
	`;

	if (excludeSemesterId != null) {
		sql += ` AND id <> ?`;
		params.push(excludeSemesterId);
	}

	sql += ` LIMIT 1`;

	const [rows] = await db.query(sql, params);

	if (rows.length > 0) {
		throw new AppError("Semester dates overlap with an existing semester.", 409);
	}
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT id, user_id, name, start_date, end_date, created_at, updated_at
		FROM semesters
		WHERE user_id = ?
		ORDER BY start_date DESC, id DESC`,
		[userId]
	);

	return rows.map(mapSemesterRow);
}

async function create(userId, { name, startDate, endDate }) {
	await overlapCheck(userId, endDate, startDate);

	try {
		const [result] = await db.query(
			`INSERT INTO semesters (user_id, name, start_date, end_date)
			VALUES (?, ?, ?, ?)`,
			[userId, name, startDate, endDate]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Semester name already in use.", 409);
		}
		throw err;
	}
}

async function findById(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT id, user_id, name, start_date, end_date, created_at, updated_at
		FROM semesters
		WHERE id = ? AND user_id = ?
		LIMIT 1`,
		[semesterId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Semester not found.", 404);
	}

	return mapSemesterRow(rows[0]);
}

async function update(userId, semesterId, { name, startDate, endDate }) {
	const setParts = [];
	const values = [];

	if (name !== undefined) {
		setParts.push("name = ?");
		values.push(name);
	}

	if (startDate !== undefined && endDate !== undefined) {
		await overlapCheck(userId, endDate, startDate, {
			excludeSemesterId: semesterId
		});

		setParts.push("start_date = ?");
		values.push(startDate);

		setParts.push("end_date = ?");
		values.push(endDate);
	}

	values.push(semesterId, userId);

	try {
		const [result] = await db.query(
			`UPDATE semesters
			SET ${setParts.join(", ")}
			WHERE id = ? AND user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Semester not found.", 404);
		}

		return await findById(userId, semesterId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Semester name already in use.", 409);
		}
		throw err;
	}
}

async function remove(userId, semesterId) {
	const [result] = await db.query(
		`DELETE FROM semesters
		WHERE id = ? AND user_id = ?`,
		[semesterId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Semester not found.", 404);
	}
}

module.exports = { findAll, create, findById, update, remove };