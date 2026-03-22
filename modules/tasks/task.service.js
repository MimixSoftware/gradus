const db = require("../../database/db");
const AppError = require('../../utils/AppError');
const taskEstimationService = require("./taskEstimation.service");

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

async function getTaskAssignmentStatus(userId, taskId) {
	const [rows] = await db.query(
		`SELECT a.status AS assignment_status
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?
		LIMIT 1`,
		[taskId, userId]
	);

	return rows[0]?.assignment_status;
}

async function getScheduledMinutesForTask(userId, taskId) {
	const [[row]] = await db.query(
		`SELECT COALESCE(SUM(st.duration_minutes), 0) AS scheduled_minutes
		FROM scheduled_tasks st
		INNER JOIN tasks t ON t.id = st.task_id
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE st.task_id = ? AND s.user_id = ?`,
		[taskId, userId]
	);

	return row?.scheduled_minutes ?? 0;
}

async function validateTaskDeadline(userId, assignmentId, deadline) {
	if (deadline === undefined || deadline === null) {
		return;
	}

	const [rows] = await db.query(
		`SELECT
			s.start_date,
			s.end_date
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

	const assignment = rows[0];

	if (deadline < assignment.start_date || deadline > assignment.end_date) {
		throw new AppError(
			"Task deadline must be between the semester start date and end date.",
			400
		);
	}
}

async function getTaskMeta(userId, taskId) {
	const [rows] = await db.query(
		`SELECT
			t.id,
			t.assignment_id,
			t.status,
			a.status AS assignment_status
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?
		LIMIT 1`,
		[taskId, userId]
	);

	return rows[0] ?? null;
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

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT
			t.id, t.assignment_id, t.name, t.description, t.status,
			t.deadline, t.etc_minutes, t.atc_minutes,
			t.created_at, t.updated_at
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ? AND s.id = ?
		ORDER BY t.id DESC`,
		[userId, semesterId]
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

	await validateTaskDeadline(userId, assignmentId, deadline);

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

	const meta = await getTaskMeta(userId, taskId);
	if (!meta) {
		throw new AppError("Task not found.", 404);
	}

	if (meta.assignment_status === "completed") {
		throw new AppError("Cannot modify tasks in a completed assignment. Reopen the assignment first.", 409);
	}

	const nextStatus = updates.status !== undefined ? updates.status : meta.status;

	if (updates.atcMinutes !== undefined && nextStatus !== "done") {
		throw new AppError("ATC can only be set when the task is in Done.", 409);
	}

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
		await validateTaskDeadline(userId, meta.assignment_id, updates.deadline);

		setParts.push("t.deadline = ?");
		values.push(updates.deadline);
	}

	if (updates.etcMinutes !== undefined) {
		const totalScheduledMinutes = await getScheduledMinutesForTask(userId, taskId);

		if (updates.etcMinutes < totalScheduledMinutes) {
			throw new AppError(
				`ETC cannot be reduced below the currently scheduled time (${totalScheduledMinutes} minutes). Unschedule some time first.`,
				409
			);
		}

		setParts.push("t.etc_minutes = ?");
		values.push(updates.etcMinutes);
	}

	if (updates.status !== undefined && updates.status !== "done") {
		setParts.push("t.atc_minutes = NULL");
	} else if (updates.atcMinutes !== undefined) {
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
	const assignmentStatus = await getTaskAssignmentStatus(userId, taskId);

	if (assignmentStatus === undefined) {
		throw new AppError("Task not found.", 404);
	}

	if (assignmentStatus === "completed") {
		throw new AppError("Cannot delete tasks in a completed assignment. Reopen the assignment first.", 409);
	}

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

async function estimate(userId, { assignmentId, taskName, taskDescription }) {
	const [[row]] = await db.query(
		`
		SELECT
			a.name AS assignment_name,
			a.description AS assignment_description,
			a.confidence AS assignment_confidence,
			a.weight AS assignment_weight
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.id = ? AND s.user_id = ?
		LIMIT 1`,
		[assignmentId, userId]
	);

	if (!row) {
		throw new AppError("Assignment not found.", 404);
	}

	const estimatedMinutes = await taskEstimationService.estimateTaskMinutes(
		taskName,
		taskDescription,
		row.assignment_name,
		row.assignment_description ?? null,
		row.assignment_confidence ?? null,
		row.assignment_weight ?? null
	);

	return estimatedMinutes;
}

module.exports = { findAll, findAllByAssignment, findAllBySemester, createInAssignment, findById, update, remove, estimate };