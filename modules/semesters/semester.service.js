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

async function validateSemesterRangeChange(userId, semesterId, newStartDate, newEndDate) {
	const [[assignmentCountRow]] = await db.query(
		`SELECT COUNT(*) AS count
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.id = ? AND s.user_id = ?
		  AND a.deadline IS NOT NULL
		  AND (a.deadline < ? OR a.deadline > ?)`,
		[semesterId, userId, newStartDate, newEndDate]
	);

	const [[taskCountRow]] = await db.query(
		`SELECT COUNT(*) AS count
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.id = ? AND s.user_id = ?
		  AND t.deadline IS NOT NULL
		  AND (t.deadline < ? OR t.deadline > ?)`,
		[semesterId, userId, newStartDate, newEndDate]
	);

	const [[scheduledCountRow]] = await db.query(
		`SELECT COUNT(*) AS count
		FROM scheduled_tasks st
		INNER JOIN tasks t ON t.id = st.task_id
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.id = ? AND s.user_id = ?
		  AND (st.session_date < ? OR st.session_date > ?)`,
		[semesterId, userId, newStartDate, newEndDate]
	);

	const assignmentViolations = assignmentCountRow?.count ?? 0;
	const taskViolations = taskCountRow?.count ?? 0;
	const scheduledViolations = scheduledCountRow?.count ?? 0;

	if (assignmentViolations || taskViolations || scheduledViolations) {
		const parts = [];

		if (assignmentViolations) {
			parts.push(
				`${assignmentViolations} assignment deadline${assignmentViolations === 1 ? "" : "s"}`
			);
		}

		if (taskViolations) {
			parts.push(
				`${taskViolations} task deadline${taskViolations === 1 ? "" : "s"}`
			);
		}

		if (scheduledViolations) {
			parts.push(
				`${scheduledViolations} scheduled task entr${scheduledViolations === 1 ? "y" : "ies"}`
			);
		}

		const message = `Cannot change semester range. The new dates would exclude: ${parts.join(", ")}. Please update or remove these first.`;

		throw new AppError(message, 409);
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

		await validateSemesterRangeChange(userId, semesterId, startDate, endDate);

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
	const [[{ count }]] = await db.query(
		`SELECT COUNT(*) AS count 
		FROM semesters 
		WHERE user_id = ?`,
		[userId]
	);

	if (count <= 1) {
		throw new AppError("You must keep at least one semester.",	400);
	}

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