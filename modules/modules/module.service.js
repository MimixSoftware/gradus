const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapModuleRow(m) {
	return {
		id: m.id,
		semesterId: m.semester_id,
		name: m.name,
		credits: m.credits,
		colour: m.colour,
		createdAt: m.created_at,
		updatedAt: m.updated_at
	};
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			m.id,
			m.semester_id,
			m.name,
			m.credits,
			m.colour,
			m.created_at,
			m.updated_at
		FROM modules m
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ?
		ORDER BY m.id DESC`,
		[userId]
	);

	return rows.map(mapModuleRow);
}

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT m.id, m.semester_id, m.name, m.credits, m.colour, m.created_at, m.updated_at
		 FROM modules m
		 INNER JOIN semesters s ON s.id = m.semester_id
		 WHERE s.user_id = ? AND s.id = ?
		 ORDER BY m.id DESC`,
		[userId, semesterId]
	);

	return rows.map(mapModuleRow);
}

async function createInSemester(userId, semesterId, { name, credits, colour }) {
	const [semRows] = await db.query(
		`SELECT 1 FROM semesters WHERE id = ? AND user_id = ? LIMIT 1`,
		[semesterId, userId]
	);

	if (semRows.length === 0) {
		throw new AppError("Semester not found.", 404);
	}

	try {
		const [result] = await db.query(
			`INSERT INTO modules (semester_id, name, credits, colour)
			 VALUES (?, ?, ?, ?)`,
			[semesterId, name, credits, colour]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Module name already in use in this semester.", 409);
		}
		throw err;
	}
}

async function findById(userId, moduleId) {
	const [rows] = await db.query(
		`SELECT
			m.id,
			m.semester_id,
			m.name,
			m.credits,
			m.colour,
			m.created_at,
			m.updated_at
		FROM modules m
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE m.id = ? AND s.user_id = ?
		LIMIT 1`,
		[moduleId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Module not found.", 404);
	}

	return mapModuleRow(rows[0]);
}

async function update(userId, moduleId, { name, credits, colour }) {
	const setParts = [];
	const values = [];

	if (name !== undefined) {
		setParts.push("m.name = ?");
		values.push(name);
	}

	if (credits !== undefined) {
		setParts.push("m.credits = ?");
		values.push(credits);
	}

	if (colour !== undefined) {
		setParts.push("m.colour = ?");
		values.push(colour);
	}

	values.push(moduleId, userId);

	try {
		const [result] = await db.query(
			`UPDATE modules m
			INNER JOIN semesters s ON s.id = m.semester_id
			SET ${setParts.join(", ")}
			WHERE m.id = ? AND s.user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Module not found.", 404);
		}

		return await findById(userId, moduleId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Module name already in use in this semester.", 409);
		}
		throw err;
	}
}

async function remove(userId, moduleId) {
	const [result] = await db.query(
		`DELETE m
		FROM modules m
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE m.id = ? AND s.user_id = ?`,
		[moduleId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Module not found.", 404);
	}
}

module.exports = { findAll, findAllBySemester, createInSemester, findById, update, remove };