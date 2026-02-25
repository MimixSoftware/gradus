const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapStudySessionRow(ss) {
	return {
		id: ss.id,
		semesterId: ss.semester_id,
		dayOfWeek: ss.day_of_week,
		startTime: ss.start_time,
		durationMinutes: ss.duration_minutes,
		createdAt: ss.created_at,
		updatedAt: ss.updated_at
	};
}

async function overlapCheckStudySession(userId, semesterId, dayOfWeek, startTime, durationMinutes, { excludeStudySessionId = null } = {}) {
	const params = [
		userId,
		semesterId,
		dayOfWeek,
		startTime,
		startTime,
		durationMinutes
	];

	let sql = `
		SELECT 1
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ?
		  AND ss.semester_id = ?
		  AND ss.day_of_week = ?
		  AND TIME_TO_SEC(?) < (TIME_TO_SEC(ss.start_time) + ss.duration_minutes * 60)
		  AND (TIME_TO_SEC(?) + ? * 60) > TIME_TO_SEC(ss.start_time)
	`;

	if (excludeStudySessionId != null) {
		sql += ` AND ss.id <> ?`;
		params.push(excludeStudySessionId);
	}

	sql += ` LIMIT 1`;

	const [rows] = await db.query(sql, params);

	if (rows.length > 0) {
		throw new AppError("Study session overlaps with an existing session.", 409);
	}
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT
			ss.id, ss.semester_id, ss.day_of_week, ss.start_time, ss.duration_minutes,
			ss.created_at, ss.updated_at
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ?
		ORDER BY ss.id DESC`,
		[userId]
	);

	return rows.map(mapStudySessionRow);
}

async function findAllBySemester(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT
			ss.id, ss.semester_id, ss.day_of_week,
			ss.start_time, ss.duration_minutes,
			ss.created_at, ss.updated_at
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE s.user_id = ? AND s.id = ?
		ORDER BY ss.id DESC`,
		[userId, semesterId]
	);

	return rows.map(mapStudySessionRow);
}

async function createInSemester(userId, semesterId, { dayOfWeek, startTime, durationMinutes }) {
	const [semRows] = await db.query(
		`SELECT 1 FROM semesters WHERE id = ? AND user_id = ? LIMIT 1`,
		[semesterId, userId]
	);

	if (semRows.length === 0) {
		throw new AppError("Semester not found.", 404);
	}

	await overlapCheckStudySession(userId, semesterId, dayOfWeek, startTime, durationMinutes);

	try {
		const [result] = await db.query(
			`INSERT INTO study_sessions
				(semester_id, day_of_week, start_time, duration_minutes)
			VALUES (?, ?, ?, ?)`,
			[semesterId, dayOfWeek, startTime, durationMinutes]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("A study session already exists at that time for this day.", 409);
		}
		throw err;
	}
}

async function findById(userId, studySessionId) {
	const [rows] = await db.query(
		`SELECT
			ss.id, ss.semester_id, ss.day_of_week, ss.start_time, ss.duration_minutes,
			ss.created_at, ss.updated_at
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE ss.id = ? AND s.user_id = ?
		LIMIT 1`,
		[studySessionId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Study session not found.", 404);
	}

	return mapStudySessionRow(rows[0]);
}

async function update(userId, studySessionId, updates) {
	const current = await findById(userId, studySessionId);

	const nextDayOfWeek = updates.dayOfWeek !== undefined ? updates.dayOfWeek : current.dayOfWeek;
	const nextStartTime = updates.startTime !== undefined ? updates.startTime : current.startTime;
	const nextDurationMinutes = updates.durationMinutes !== undefined ? updates.durationMinutes : current.durationMinutes;

	await overlapCheckStudySession(
		userId,
		current.semesterId,
		nextDayOfWeek,
		nextStartTime,
		nextDurationMinutes,
		{ excludeStudySessionId: studySessionId }
	);

	const setParts = [];
	const values = [];

	if (updates.dayOfWeek !== undefined) {
		setParts.push("ss.day_of_week = ?");
		values.push(updates.dayOfWeek);
	}

	if (updates.startTime !== undefined) {
		setParts.push("ss.start_time = ?");
		values.push(updates.startTime);
	}

	if (updates.durationMinutes !== undefined) {
		setParts.push("ss.duration_minutes = ?");
		values.push(updates.durationMinutes);
	}

	if (setParts.length === 0) {
		throw new AppError("At least one field is required.", 400);
	}

	values.push(studySessionId, userId);

	try {
		const [result] = await db.query(
			`UPDATE study_sessions ss
			 INNER JOIN semesters s ON s.id = ss.semester_id
			 SET ${setParts.join(", ")}
			 WHERE ss.id = ? AND s.user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Study session not found.", 404);
		}

		return await findById(userId, studySessionId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("A study session already exists at that time for this day.", 409);
		}
		throw err;
	}
}

async function remove(userId, studySessionId) {
	const [result] = await db.query(
		`DELETE ss
		FROM study_sessions ss
		INNER JOIN semesters s ON s.id = ss.semester_id
		WHERE ss.id = ? AND s.user_id = ?`,
		[studySessionId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Study session not found.", 404);
	}
}

module.exports = { findAll, findAllBySemester, createInSemester, findById, update, remove };