const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapAssignmentRow(a) {
	return {
		id: a.id,
		moduleId: a.module_id,
		name: a.name,
		description: a.description,
		status: a.status,
		weight: a.weight,
		confidence: a.confidence,
		deadline: a.deadline,
		createdAt: a.created_at,
		updatedAt: a.updated_at
	};
}

async function getModuleWeightTotal(userId, moduleId, { excludeAssignmentId = null } = {}) {
	const params = [userId, moduleId];
	let excludeSql = "";

	if (excludeAssignmentId !== null) {
		excludeSql = "AND a.id <> ?";
		params.push(excludeAssignmentId);
	}

	const [rows] = await db.query(
		`SELECT COALESCE(SUM(a.weight), 0) AS total
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ?
			AND m.id = ?
			AND a.weight IS NOT NULL
			${excludeSql}`,
		params
	);

	return Number(rows[0].total) || 0;
}

async function getAssignmentMeta(userId, assignmentId) {
	const [rows] = await db.query(
		`SELECT a.id, a.module_id, a.status
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.id = ? AND s.user_id = ?
		LIMIT 1`,
		[assignmentId, userId]
	);

	return rows[0] ?? null;
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			a.id, a.module_id, a.name, a.description, a.status,
			a.weight, a.confidence, a.deadline,
			a.created_at, a.updated_at
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ?
		ORDER BY a.id DESC`,
		[userId]
	);

	return rows.map(mapAssignmentRow);
}

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT
			a.id, a.module_id, a.name, a.description, a.status,
			a.weight, a.confidence, a.deadline,
			a.created_at, a.updated_at
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ? AND s.id = ?
		ORDER BY a.id DESC`,
		[userId, semesterId]
	);

	return rows.map(mapAssignmentRow);
}

async function findAllByModule(userId, moduleId) {
	const [rows] = await db.query(
		`SELECT
			a.id, a.module_id, a.name, a.description, a.status,
			a.weight, a.confidence, a.deadline,
			a.created_at, a.updated_at
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ? AND m.id = ?
		ORDER BY a.id DESC`,
		[userId, moduleId]
	);

	return rows.map(mapAssignmentRow);
}

async function createInModule(userId, moduleId, { name, description, weight, confidence, deadline }) {
	const [moduleRows] = await db.query(
		`SELECT 1
		FROM modules m
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE m.id = ? AND s.user_id = ?
		LIMIT 1`,
		[moduleId, userId]
	);

	if (moduleRows.length === 0) {
		throw new AppError("Module not found.", 404);
	}

	if (weight !== undefined && weight !== null) {
		const total = await getModuleWeightTotal(userId, moduleId);
		if (total + weight > 100) {
			throw new AppError(`Total assignment weight for this module would exceed 100% (${total + weight}%).`, 400);
		}
	}

	try {
		const [result] = await db.query(
			`INSERT INTO assignments
				(module_id, name, description, weight, confidence, deadline)
			VALUES (?, ?, ?, ?, ?, ?)`,
			[moduleId, name, description, weight, confidence, deadline]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Assignment name already in use in this module.", 409);
		}
		throw err;
	}
}

async function findById(userId, assignmentId) {
	const [rows] = await db.query(
		`SELECT
			a.id, a.module_id, a.name, a.description, a.status,
			a.weight, a.confidence, a.deadline,
			a.created_at, a.updated_at
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.id = ? AND s.user_id = ?
		LIMIT 1`,
		[assignmentId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Assignment not found.", 404);
	}

	return mapAssignmentRow(rows[0]);
}

async function update(userId, assignmentId, updates) {
	const setParts = [];
	const values = [];

	const meta = await getAssignmentMeta(userId, assignmentId);
	if (!meta) {
		throw new AppError("Assignment not found.", 404);
	}

	const updateKeys = Object.keys(updates);
	const onlyStatusUpdate = updateKeys.length === 1 && updateKeys[0] === "status";

	if (meta.status === "completed" && !onlyStatusUpdate) {
		throw new AppError("Completed assignments are read-only. Reopen to edit.", 409);
	}

	if (updates.status !== undefined && updates.status === "completed" && meta.status !== "completed") {
		const [rows] = await db.query(
			`SELECT
				SUM(t.status = 'todo')  AS todo_count,
				SUM(t.status = 'doing') AS doing_count
			FROM tasks t
			WHERE t.assignment_id = ?`,
			[assignmentId]
		);

		const todoCount = Number(rows[0]?.todo_count ?? 0);
		const doingCount = Number(rows[0]?.doing_count ?? 0);

		if (todoCount > 0 || doingCount > 0) {
			throw new AppError(`Cannot complete assignment while tasks remain unfinished (To Do: ${todoCount}, Doing: ${doingCount}).`, 409);
		}
	}

	if (updates.weight !== undefined && updates.weight !== null) {
		const totalOther = await getModuleWeightTotal(userId, meta.module_id, { excludeAssignmentId: assignmentId });
		if (totalOther + updates.weight > 100) {
			throw new AppError(`Total assignment weight for this module would exceed 100% (${totalOther + updates.weight}%).`, 400);
		}
	}

	if (updates.name !== undefined) {
		setParts.push("a.name = ?");
		values.push(updates.name);
	}

	if (updates.description !== undefined) {
		setParts.push("a.description = ?");
		values.push(updates.description);
	}

	if (updates.status !== undefined) {
		setParts.push("a.status = ?");
		values.push(updates.status);
	}

	if (updates.weight !== undefined) {
		setParts.push("a.weight = ?");
		values.push(updates.weight);
	}

	if (updates.confidence !== undefined) {
		setParts.push("a.confidence = ?");
		values.push(updates.confidence);
	}

	if (updates.deadline !== undefined) {
		setParts.push("a.deadline = ?");
		values.push(updates.deadline);
	}

	if (setParts.length === 0) {
		throw new AppError("At least one field is required.", 400);
	}

	values.push(assignmentId, userId);

	try {
		const [result] = await db.query(
			`UPDATE assignments a
			INNER JOIN modules m ON m.id = a.module_id
			INNER JOIN semesters s ON s.id = m.semester_id
			SET ${setParts.join(", ")}
			WHERE a.id = ? AND s.user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Assignment not found.", 404);
		}

		return await findById(userId, assignmentId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Assignment name already in use in this module.", 409);
		}
		throw err;
	}
}

async function remove(userId, assignmentId) {
	const [result] = await db.query(
		`DELETE a
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.id = ? AND s.user_id = ?`,
		[assignmentId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Assignment not found.", 404);
	}
}

module.exports = { findAll, findAllBySemester, findAllByModule, createInModule, findById, update, remove };