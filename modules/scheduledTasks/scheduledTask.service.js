const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapScheduledTaskRow(st) {
	return {
		id: st.id,
		taskId: st.task_id,
		studySessionId: st.study_session_id,
		sessionDate: st.session_date,
		position: st.position,
		durationMinutes: st.duration_minutes,
		createdAt: st.created_at,
		updatedAt: st.updated_at
	};
}

async function spilloverCheckScheduledTask(studySessionId, sessionDate, newDuration, { excludeTaskId = null } = {}) {
	let params = [studySessionId, sessionDate];
	let excludeSql = "";

	if (excludeTaskId !== null) {
		excludeSql = "AND id <> ?";
		params.push(excludeTaskId);
	}

	const [[sessionRow]] = await db.query(
		`SELECT duration_minutes AS session_duration_minutes
		FROM study_sessions
		WHERE id = ?`,
		[studySessionId]
	);
	if (!sessionRow) {
		throw new AppError("Study session not found.", 404);
	}

	const [tasks] = await db.query(`
		SELECT duration_minutes
		FROM scheduled_tasks
		WHERE study_session_id = ? AND session_date = ? ${excludeSql}`,
		params
	);

	const totalMinutes = tasks.reduce((sum, t) => sum + t.duration_minutes, 0);
	if (totalMinutes + newDuration > sessionRow.session_duration_minutes) {
		throw new AppError("Task does not fit into this study session.", 400);
	}
}

async function sessionDateCheckScheduledTask(userId, studySessionId, sessionDate) {
	const [rows] = await db.query(
		`SELECT
			ss.day_of_week,
			ss.duration_minutes AS session_duration_minutes,
			s.start_date AS semester_start_date,
			s.end_date AS semester_end_date
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE ss.id = ? AND s.user_id = ?
		LIMIT 1`,
		[studySessionId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Study session not found.", 404);
	}

	const info = rows[0];

	if (sessionDate < info.semester_start_date || sessionDate > info.semester_end_date) {
		throw new AppError("Session date is outside the semester date range.", 400);
	}

	const jsWeekday = new Date(sessionDate).getUTCDay();
	const mysqlWeekday = (jsWeekday + 6) % 7;

	if (mysqlWeekday !== info.day_of_week) {
		throw new AppError("Session date does not match the study session's day of week.", 400);
	}
}

async function etcOverflowCheckScheduledTask(userId, taskId, durationMinutes, { excludeScheduledTaskId = null } = {}) {
	const params = [taskId];
	let sql = `
		SELECT COALESCE(SUM(st.duration_minutes), 0) AS total
		FROM scheduled_tasks st
		WHERE st.task_id = ?`;

	if (excludeScheduledTaskId !== null) {
		sql += ` AND st.id <> ?`;
		params.push(excludeScheduledTaskId);
	}

	const [[sumRow]] = await db.query(sql, params);

	const [[taskRow]] = await db.query(
		`SELECT t.etc_minutes
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?
		LIMIT 1`,
		[taskId, userId]
	);

	if (!taskRow) {
		throw new AppError("Task not found.", 404);
	}

	const totalScheduled = Number(sumRow.total);
	const newDuration = Number(durationMinutes);
	const etc = taskRow.etc_minutes !== null ? Number(taskRow.etc_minutes) : null;

	if (etc !== null && totalScheduled + newDuration > etc) {
		throw new AppError("Scheduled time exceeds the task's estimated time.", 400);
	}
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.position, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ?
		ORDER BY st.session_date DESC, st.position ASC, st.id DESC`,
		[userId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function findAllByStudySession(userId, studySessionId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.position, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ? AND ss.id = ?
		ORDER BY st.session_date DESC, st.position ASC, st.id DESC`,
		[userId, studySessionId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function findAllByAssignment(userId, assignmentId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.position, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN tasks t ON t.id = st.task_id
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.user_id = ? AND a.id = ?
		ORDER BY st.session_date DESC, st.position ASC, st.id DESC`,
		[userId, assignmentId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.position, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ? AND s.id = ?
		ORDER BY st.session_date DESC, st.position ASC, st.id DESC`,
		[userId, semesterId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function createInStudySession(userId, studySessionId, { taskId, sessionDate, position, durationMinutes }) {
	await sessionDateCheckScheduledTask(userId, studySessionId, sessionDate);

	const [[taskRow]] = await db.query(`
		SELECT t.etc_minutes
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.id = ? AND s.user_id = ?
		LIMIT 1`,
		[taskId, userId]
	);

	if (!taskRow) {
		throw new AppError("Task not found.", 404);
	}

	await etcOverflowCheckScheduledTask(userId, taskId, durationMinutes);
	await spilloverCheckScheduledTask(studySessionId, sessionDate, durationMinutes);

	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		const [[countRow]] = await connection.query(`
			SELECT COUNT(*) AS count
			FROM scheduled_tasks
			WHERE study_session_id = ? AND session_date = ?`,
			[studySessionId, sessionDate]
		);

		let insertPosition = position != null ? position : countRow.count;
		insertPosition = Math.max(0, Math.min(insertPosition, countRow.count));

		const TEMP_OFFSET = 1000000;

		if (position != null) {
			await connection.query(`
				UPDATE scheduled_tasks
				SET position = position + ?
				WHERE study_session_id = ?
				  AND session_date = ?
				  AND position >= ?`,
				[TEMP_OFFSET, studySessionId, sessionDate, insertPosition]
			);

			await connection.query(`
				UPDATE scheduled_tasks
				SET position = position - ? + 1
				WHERE study_session_id = ?
				  AND session_date = ?
				  AND position >= ?`,
				[TEMP_OFFSET, studySessionId, sessionDate, TEMP_OFFSET]
			);
		}

		const [result] = await connection.query(`
			INSERT INTO scheduled_tasks
				(task_id, study_session_id, session_date, position, duration_minutes)
			VALUES (?, ?, ?, ?, ?)`,
			[taskId, studySessionId, sessionDate, insertPosition, durationMinutes]
		);

		await connection.commit();
		return await findById(userId, result.insertId);

	} catch (err) {
		await connection.rollback();

		if (err.code === "ER_DUP_ENTRY") {
			if (err.sqlMessage.includes("uq_scheduled_tasks_unique_slot")) {
				throw new AppError("Another task already occupies this position in the session.", 409);
			} else if (err.sqlMessage.includes("uq_scheduled_tasks_unique_task_per_session")) {
				throw new AppError("This task is already scheduled in this session on this date.", 409);
			}
		}

		throw err;
	} finally {
		connection.release();
	}
}

async function createMany(userId, allocations) {
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		const createdIds = [];

		for (const allocation of allocations) {
			const { taskId, studySessionId, sessionDate, position, durationMinutes } = allocation;

			await sessionDateCheckScheduledTask(userId, studySessionId, sessionDate);

			const [[taskRow]] = await connection.query(
				`
				SELECT t.etc_minutes
				FROM tasks t
				INNER JOIN assignments a ON a.id = t.assignment_id
				INNER JOIN modules m ON m.id = a.module_id
				INNER JOIN semesters s ON s.id = m.semester_id
				WHERE t.id = ? AND s.user_id = ?
				LIMIT 1`,
				[taskId, userId]
			);

			if (!taskRow) {
				throw new AppError("Task not found.", 404);
			}

			await etcOverflowCheckScheduledTask(userId, taskId, durationMinutes, connection);
			await spilloverCheckScheduledTask(studySessionId, sessionDate, durationMinutes, connection);

			const [[countRow]] = await connection.query(
				`
				SELECT COUNT(*) AS count
				FROM scheduled_tasks
				WHERE study_session_id = ? AND session_date = ?`,
				[studySessionId, sessionDate]
			);

			let insertPosition = position != null ? position : countRow.count;
			insertPosition = Math.max(0, Math.min(insertPosition, countRow.count));

			const TEMP_OFFSET = 1000000;

			if (position != null) {
				await connection.query(
					`
					UPDATE scheduled_tasks
					SET position = position + ?
					WHERE study_session_id = ?
					  AND session_date = ?
					  AND position >= ?`,
					[TEMP_OFFSET, studySessionId, sessionDate, insertPosition]
				);

				await connection.query(
					`
					UPDATE scheduled_tasks
					SET position = position - ? + 1
					WHERE study_session_id = ?
					  AND session_date = ?
					  AND position >= ?`,
					[TEMP_OFFSET, studySessionId, sessionDate, TEMP_OFFSET]
				);
			}

			const [result] = await connection.query(
				`
				INSERT INTO scheduled_tasks
					(task_id, study_session_id, session_date, position, duration_minutes)
				VALUES (?, ?, ?, ?, ?)`,
				[taskId, studySessionId, sessionDate, insertPosition, durationMinutes]
			);

			createdIds.push(result.insertId);
		}

		await connection.commit();

		const createdScheduledTasks = [];
		for (const id of createdIds) {
			createdScheduledTasks.push(await findById(userId, id));
		}

		return createdScheduledTasks;
	} catch (err) {
		await connection.rollback();

		if (err.code === "ER_DUP_ENTRY") {
			if (err.sqlMessage.includes("uq_scheduled_tasks_unique_slot")) {
				throw new AppError("Another task already occupies this position in the session.", 409);
			}

			if (err.sqlMessage.includes("uq_scheduled_tasks_unique_task_per_session")) {
				throw new AppError("This task is already scheduled in this session on this date.", 409);
			}
		}

		throw err;
	} finally {
		connection.release();
	}
}

async function findById(userId, scheduledTaskId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.position, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE st.id = ? AND s.user_id = ?
		LIMIT 1`,
		[scheduledTaskId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Scheduled task not found.", 404);
	}

	return mapScheduledTaskRow(rows[0]);
}

async function update(userId, scheduledTaskId, updates) {
	const current = await findById(userId, scheduledTaskId);

	let nextPosition = updates.position ?? current.position;
	const nextDuration = updates.durationMinutes ?? current.durationMinutes;

	const [[sessionRow]] = await db.query(`
		SELECT ss.duration_minutes AS session_duration_minutes
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE ss.id = ? AND s.user_id = ?
		LIMIT 1`,
		[current.studySessionId, userId]
	);
	if (!sessionRow) {
		throw new AppError("Study session not found.", 404);
	}

	await etcOverflowCheckScheduledTask(userId, current.taskId, nextDuration, {
		excludeScheduledTaskId: scheduledTaskId
	});

	await spilloverCheckScheduledTask(
		current.studySessionId,
		current.sessionDate,
		nextDuration,
		{ excludeTaskId: scheduledTaskId }
	);

	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		const [[countRow]] = await connection.query(`
			SELECT COUNT(*) AS count
			FROM scheduled_tasks
			WHERE study_session_id = ? AND session_date = ? AND id <> ?`,
			[current.studySessionId, current.sessionDate, scheduledTaskId]
		);

		nextPosition = Math.max(0, Math.min(nextPosition, countRow.count));

		if (current.position !== nextPosition) {
			await connection.query(`
				UPDATE scheduled_tasks
				SET position = 1000000
				WHERE id = ?`,
				[scheduledTaskId]
			);

			if (nextPosition < current.position) {
				await connection.query(`
					UPDATE scheduled_tasks
					SET position = position + 1
					WHERE study_session_id = ?
					  AND session_date = ?
					  AND position >= ?
					  AND position < ?`,
					[current.studySessionId, current.sessionDate, nextPosition, current.position]
				);
			} else {
				await connection.query(`
					UPDATE scheduled_tasks
					SET position = position - 1
					WHERE study_session_id = ?
					  AND session_date = ?
					  AND position > ?
					  AND position <= ?`,
					[current.studySessionId, current.sessionDate, current.position, nextPosition]
				);
			}
		}

		await connection.query(`
			UPDATE scheduled_tasks
			SET position = ?, duration_minutes = ?
			WHERE id = ?`,
			[nextPosition, nextDuration, scheduledTaskId]
		);

		await connection.commit();

		return await findById(userId, scheduledTaskId);
	} catch (err) {
		await connection.rollback();

		if (err.code === "ER_DUP_ENTRY") {
			if (err.sqlMessage.includes("uq_scheduled_tasks_unique_slot")) {
				throw new AppError("Another task already occupies this position in the session.", 409);
			}
			if (err.sqlMessage.includes("uq_scheduled_tasks_unique_task_per_session")) {
				throw new AppError("This task is already scheduled in this session on this date.", 409);
			}
		}

		throw err;
	} finally {
		connection.release();
	}
}

async function remove(userId, scheduledTaskId) {
	const task = await findById(userId, scheduledTaskId);

	const connection = await db.getConnection();
	try {
		await connection.beginTransaction();
		const [result] = await connection.query(`
			DELETE st
			FROM scheduled_tasks st
			INNER JOIN study_sessions ss ON ss.id = st.study_session_id
			INNER JOIN semesters s ON s.id = ss.semester_id
			WHERE st.id = ? AND s.user_id = ?`,
			[scheduledTaskId, userId]
		);

		if (result.affectedRows === 0) {
			throw new AppError("Scheduled task not found.", 404);
		}

		await connection.query(`
			UPDATE scheduled_tasks
			SET position = position - 1
			WHERE study_session_id = ? AND session_date = ? AND position > ?`,
			[task.studySessionId, task.sessionDate, task.position]
		);

		await connection.commit();
	} catch (err) {
		await connection.rollback();
		throw err;
	} finally {
		connection.release();
	}
}

module.exports = { findAll, findAllByStudySession, findAllByAssignment, findAllBySemester, createInStudySession, createMany, findById, update, remove };