const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapTaskRow(t) {
	return {
		id: t.id,
		assignmentId: t.assignment_id,
		name: t.name,
		description: t.description,
		status: t.status,
		deadline: t.deadline,
		etcMinutes: t.etc_minutes,
		atcMinutes: t.atc_minutes,
		createdAt: t.created_at,
		updatedAt: t.updated_at
	};
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			t.id, t.assignment_id, t.name, t.description, t.status,
			t.deadline, t.etc_minutes, t.atc_minutes,
			t.created_at, t.updated_at
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ?
		ORDER BY t.id DESC`,
		[userId]
	);

	return rows.map(mapTaskRow);
}

async function findAllByAssignment(userId, assignmentId) {
	const [rows] = await db.query(
		`SELECT
			t.id, t.assignment_id, t.name, t.description, t.status,
			t.deadline, t.etc_minutes, t.atc_minutes,
			t.created_at, t.updated_at
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ? AND a.id = ?
		ORDER BY t.id DESC`,
		[userId, assignmentId]
	);

	return rows.map(mapTaskRow);
}

async function createInAssignment(userId, assignmentId, { name, description, deadline, etcMinutes }) {
	const [assignmentRows] = await db.query(
		`SELECT 1
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.id = ? AND s.user_id = ?
		LIMIT 1`,
		[assignmentId, userId]
	);

	if (assignmentRows.length === 0) {
		throw new AppError("Assignment not found.", 404);
	}

	try {
		const [result] = await db.query(
			`INSERT INTO tasks
				(assignment_id, name, description, deadline, etc_minutes)
			VALUES (?, ?, ?, ?, ?)`,
			[assignmentId, name, description, deadline, etcMinutes]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Task name already in use in this assignment.", 409);
		}
		throw err;
	}
}

async function findById(userId, taskId) {
	const [rows] = await db.query(
		`SELECT
			t.id, t.assignment_id, t.name, t.description, t.status,
			t.deadline, t.etc_minutes, t.atc_minutes,
			t.created_at, t.updated_at
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?
		LIMIT 1`,
		[taskId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Task not found.", 404);
	}

	return mapTaskRow(rows[0]);
}

async function update(userId, taskId, updates) {
	const setParts = [];
	const values = [];

	if (updates.name !== undefined) {
		setParts.push("t.name = ?");
		values.push(updates.name);
	}

	if (updates.description !== undefined) {
		setParts.push("t.description = ?");
		values.push(updates.description);
	}

	if (updates.status !== undefined) {
		setParts.push("t.status = ?");
		values.push(updates.status);
	}

	if (updates.deadline !== undefined) {
		setParts.push("t.deadline = ?");
		values.push(updates.deadline);
	}

	if (updates.etcMinutes !== undefined) {
		setParts.push("t.etc_minutes = ?");
		values.push(updates.etcMinutes);
	}

	if (updates.atcMinutes !== undefined) {
		setParts.push("t.atc_minutes = ?");
		values.push(updates.atcMinutes);
	}

	if (setParts.length === 0) {
		throw new AppError("At least one field is required.", 400);
	}

	values.push(taskId, userId);

	try {
		const [result] = await db.query(
			`UPDATE tasks t
			INNER JOIN assignments a ON a.id = t.assignment_id
			INNER JOIN modules m ON m.id = a.module_id
			INNER JOIN semesters s ON s.id = m.semester_id
			SET ${setParts.join(", ")}
			WHERE t.id = ? AND s.user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Task not found.", 404);
		}

		return await findById(userId, taskId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Task name already in use in this assignment.", 409);
		}
		throw err;
	}
}

async function remove(userId, taskId) {
	const [result] = await db.query(
		`DELETE t
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?`,
		[taskId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Task not found.", 404);
	}
}

module.exports = { findAll, findAllByAssignment, createInAssignment, findById, update, remove };