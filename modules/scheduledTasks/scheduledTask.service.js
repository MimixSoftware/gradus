const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapScheduledTaskRow(st) {
	return {
		id: st.id,
		taskId: st.task_id,
		studySessionId: st.study_session_id,
		sessionDate: st.session_date,
        startMinute: st.start_minute,
		durationMinutes: st.duration_minutes,
		createdAt: st.created_at,
		updatedAt: st.updated_at
	};
}

function spilloverCheckScheduledTask(startMinute, durationMinutes, sessionDurationMinutes) {
	if (startMinute + durationMinutes > sessionDurationMinutes) {
		throw new AppError("Task does not fit into this study session.", 400);
	}
}

async function overlapCheckScheduledTask(userId, studySessionId, sessionDate, startMinute, durationMinutes, { excludeScheduledTaskId = null } = {}) {
	const params = [
		studySessionId,
		sessionDate,
		startMinute,
		startMinute,
		durationMinutes
	];

	let sql = `
		SELECT 1
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ?
		  AND st.study_session_id = ?
		  AND st.session_date = ?
		  AND ? < (st.start_minute + st.duration_minutes)
		  AND (? + ?) > st.start_minute
	`;

	params.unshift(userId);

	if (excludeScheduledTaskId != null) {
		sql += ` AND st.id <> ?`;
		params.push(excludeScheduledTaskId);
	}

	sql += ` LIMIT 1`;

	const [rows] = await db.query(sql, params);

	if (rows.length > 0) {
		throw new AppError("Scheduled task overlaps with an existing scheduled task.", 409);
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

	const [[wdRow]] = await db.query(`SELECT WEEKDAY(?) AS wd`, [sessionDate]);
	if (wdRow.wd !== info.day_of_week) {
		throw new AppError("Session date does not match the study session's day of week.", 400);
	}

	return {
		sessionDurationMinutes: info.session_duration_minutes
	};
}

async function etcOverflowCheckScheduledTask(userId, taskId, durationMinutes, { excludeScheduledTaskId = null } = {}) {

	const params = [taskId];
	let sql = `
		SELECT COALESCE(SUM(st.duration_minutes), 0) AS total
		FROM scheduled_tasks st
		WHERE st.task_id = ?
	`;

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
        throw new AppError(
            "Scheduled time exceeds the task's estimated time.",
            400
        );
    }
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.start_minute, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ?
		ORDER BY st.session_date DESC, st.start_minute ASC, st.id DESC`,
		[userId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function findAllByStudySession(userId, studySessionId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.start_minute, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ? AND ss.id = ?
		ORDER BY st.session_date DESC, st.start_minute ASC, st.id DESC`,
		[userId, studySessionId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.start_minute, st.duration_minutes,
			st.created_at, st.updated_at
		FROM scheduled_tasks st
		INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ? AND s.id = ?
		ORDER BY st.session_date DESC, st.start_minute ASC, st.id DESC`,
		[userId, semesterId]
	);

	return rows.map(mapScheduledTaskRow);
}

async function createInStudySession(userId, studySessionId, { taskId, sessionDate, startMinute, durationMinutes }) {
	const [sessionRows] = await db.query(
		`SELECT 1
		 FROM study_sessions ss
		 INNER JOIN semesters s ON s.id = ss.semester_id
		 WHERE ss.id = ? AND s.user_id = ?
		 LIMIT 1`,
		[studySessionId, userId]
	);

	if (sessionRows.length === 0) {
		throw new AppError("Study session not found.", 404);
	}

    const [taskRows] = await db.query(
		`SELECT 1
		 FROM tasks t
		 INNER JOIN assignments a ON a.id = t.assignment_id
		 INNER JOIN modules m ON m.id = a.module_id
		 INNER JOIN semesters s ON s.id = m.semester_id
		 WHERE t.id = ? AND s.user_id = ?
		 LIMIT 1`,
		[taskId, userId]
	);

	if (taskRows.length === 0) {
		throw new AppError("Task not found.", 404);
	}

    await etcOverflowCheckScheduledTask(userId, taskId, durationMinutes);

    const { sessionDurationMinutes } = await sessionDateCheckScheduledTask(userId, studySessionId, sessionDate);

	spilloverCheckScheduledTask(startMinute, durationMinutes, sessionDurationMinutes);
	await overlapCheckScheduledTask(userId, studySessionId, sessionDate, startMinute, durationMinutes);

	try {
		const [result] = await db.query(
			`INSERT INTO scheduled_tasks
				(task_id, study_session_id, session_date, start_minute, duration_minutes)
			 VALUES (?, ?, ?, ?, ?)`,
			[taskId, studySessionId, sessionDate, startMinute, durationMinutes]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Task already scheduled for this session on this date.", 409);
		}
		throw err;
	}
}

async function findById(userId, scheduledTaskId) {
	const [rows] = await db.query(
		`SELECT
			st.id, st.task_id, st.study_session_id, st.session_date, st.start_minute, st.duration_minutes,
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

	const nextSessionDate = updates.sessionDate !== undefined ? updates.sessionDate : current.sessionDate;
	const nextStartMinute = updates.startMinute !== undefined ? updates.startMinute : current.startMinute;
	const nextDurationMinutes = updates.durationMinutes !== undefined ? updates.durationMinutes : current.durationMinutes;

    const [sessionRows] = await db.query(
		`SELECT 1
		 FROM study_sessions ss
		 INNER JOIN semesters s ON s.id = ss.semester_id
		 WHERE ss.id = ? AND s.user_id = ?
		 LIMIT 1`,
		[current.studySessionId, userId]
	);

	if (sessionRows.length === 0) {
		throw new AppError("Study session not found.", 404);
	}

    await etcOverflowCheckScheduledTask(
        userId,
        current.taskId,
        nextDurationMinutes,
        { excludeScheduledTaskId: scheduledTaskId }
    );

    const { sessionDurationMinutes } = await sessionDateCheckScheduledTask(userId, current.studySessionId, nextSessionDate);
	spilloverCheckScheduledTask(nextStartMinute, nextDurationMinutes, sessionDurationMinutes);
	await overlapCheckScheduledTask(
		userId,
		current.studySessionId,
		nextSessionDate,
		nextStartMinute,
		nextDurationMinutes,
		{ excludeScheduledTaskId: scheduledTaskId }
	);

	const setParts = [];
	const values = [];

	if (updates.sessionDate !== undefined) {
		setParts.push("st.session_date = ?");
		values.push(updates.sessionDate);
	}
	if (updates.startMinute !== undefined) {
		setParts.push("st.start_minute = ?");
		values.push(updates.startMinute);
	}
	if (updates.durationMinutes !== undefined) {
		setParts.push("st.duration_minutes = ?");
		values.push(updates.durationMinutes);
	}

	if (setParts.length === 0) {
		throw new AppError("At least one field is required.", 400);
	}

	values.push(scheduledTaskId, userId);

	try {
		const [result] = await db.query(
			`UPDATE scheduled_tasks st
			 INNER JOIN study_sessions ss ON ss.id = st.study_session_id
			 INNER JOIN semesters s ON s.id = ss.semester_id
			 SET ${setParts.join(", ")}
			 WHERE st.id = ? AND s.user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Scheduled task not found.", 404);
		}

		return await findById(userId, scheduledTaskId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Task already scheduled for this session on this date.", 409);
		}
		throw err;
	}
}

async function remove(userId, scheduledTaskId) {
	const [result] = await db.query(
		`DELETE st
		 FROM scheduled_tasks st
		 INNER JOIN study_sessions ss ON ss.id = st.study_session_id
		 INNER JOIN semesters s ON s.id = ss.semester_id
		 WHERE st.id = ? AND s.user_id = ?`,
		[scheduledTaskId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Scheduled task not found.", 404);
	}
}

module.exports = { findAll, findAllByStudySession, findAllBySemester, createInStudySession, findById, update, remove };