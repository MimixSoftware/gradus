const db = require("../../database/db");
const AppError = require('../../utils/AppError');

function mapSemesterRow(row) {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		startDate: row.start_date,
		endDate: row.end_date,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

async function getSemester(userId, semesterId) {
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

async function getOverview(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT 
			COUNT(t.id) AS total_tasks,
			SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
			SUM(CASE WHEN t.deadline IS NOT NULL AND t.deadline < NOW() AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue_tasks,
			SUM(CASE WHEN t.status = 'done' AND t.atc_minutes IS NOT NULL THEN t.etc_minutes ELSE 0 END) AS total_etc_minutes,
			SUM(CASE WHEN t.status = 'done' AND t.atc_minutes IS NOT NULL THEN t.atc_minutes ELSE 0 END) AS total_atc_minutes,
			COUNT(CASE WHEN t.status = 'done' AND t.atc_minutes IS NOT NULL THEN 1 END) AS completed_tasks_with_atc
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		WHERE m.semester_id = ? AND m.semester_id IN (
			SELECT s.id FROM semesters s WHERE s.user_id = ?
		)`,
		[semesterId, userId]
	);

	const [unscheduledRows] = await db.query(
		`SELECT COUNT(DISTINCT t.id) AS unscheduled_count
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		WHERE m.semester_id = ? 
		  AND m.semester_id IN (SELECT s.id FROM semesters s WHERE s.user_id = ?)
		  AND t.status != 'done'
		  AND t.id NOT IN (
			SELECT DISTINCT st.task_id 
			FROM scheduled_tasks st
		  )`,
		[semesterId, userId]
	);

	const data = rows[0];
	const unscheduledData = unscheduledRows[0];

	const totalTasks = data.total_tasks || 0;
	const completedTasks = data.completed_tasks || 0;
	const overdueTasks = data.overdue_tasks || 0;
	const unscheduledTasks = unscheduledData.unscheduled_count || 0;

	const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

	let estimationAccuracy = 0;
	if (data.completed_tasks_with_atc > 0 && data.total_etc_minutes > 0) {
		estimationAccuracy = Math.round(
			(data.total_atc_minutes / data.total_etc_minutes) * 100
		);
	}

	return {
		tasksCompleted: completedTasks,
		completionRate,
		overdueTasks,
		unscheduledWork: unscheduledTasks,
		estimationAccuracy
	};
}

async function getStatistics(userId, semesterId) {
	const semester = await getSemester(userId, semesterId);

	const overview = await getOverview(userId, semester.id);
	// const analytics = await getAnalytics(userId, semester.id);
	// const insights = buildInsights({ overview, analytics });

	return {
		overview
		// analytics,
		// insights
	};
}

module.exports = { getStatistics };