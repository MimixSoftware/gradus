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
	// Assignment overview
	const [assignmentCountsRows] = await db.query(
		`SELECT 
			COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_count,
			COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_count
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE m.semester_id = ?
		AND s.user_id = ?`,
		[semesterId, userId]
	);

	const activeAssignments = assignmentCountsRows[0].active_count;
	const completedCount = assignmentCountsRows[0].completed_count;

	// Task overview
	const [taskStatsRows] = await db.query(
		`SELECT 
			ROUND(AVG(CASE WHEN t.etc_minutes IS NOT NULL THEN t.etc_minutes END)) AS avg_etc,
			ROUND(AVG(CASE WHEN t.atc_minutes IS NOT NULL THEN t.atc_minutes END)) AS avg_atc,
			ROUND(AVG(CASE 
				WHEN t.etc_minutes IS NOT NULL AND t.atc_minutes IS NOT NULL THEN t.etc_minutes / t.atc_minutes * 100 
			END)) AS accuracy_percent
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.id = ?
		AND s.user_id = ?`,
		[semesterId, userId]
	);

	const avgETC = taskStatsRows[0].avg_etc;
	const avgATC = taskStatsRows[0].avg_atc;
	const accuracyPercent = taskStatsRows[0].accuracy_percent;

	return [
		{ key: 'activeAssignments', label: 'Active Assignments', value: activeAssignments },
		{ key: 'completedAssignments', label: 'Completed Assignments', value: completedCount },
		{ key: 'avgETC', label: 'Average Task ETC (minutes)', value: avgETC },
		{ key: 'avgATC', label: 'Average Task ATC (minutes)', value: avgATC },
		{ key: 'accuracyPercent', label: 'Estimation Accuracy (%)', value: accuracyPercent }
	];
}

async function getAnalytics(userId, semesterId) {
	// Task Status Distribution
	const [statusDistributionRows] = await db.query(
		`SELECT 
			SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_count,
			SUM(CASE WHEN t.status = 'doing' THEN 1 ELSE 0 END) AS doing_count,
			SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		WHERE m.semester_id = ? 
			AND a.status = 'active'
			AND m.semester_id IN (SELECT s.id FROM semesters s WHERE s.user_id = ?)`,
		[semesterId, userId]
	);

	const distribution = statusDistributionRows[0];
	const todoCount = Number(distribution?.todo_count) || 0;
	const doingCount = Number(distribution?.doing_count) || 0;
	const doneCount = Number(distribution?.done_count) || 0;

	const taskStatusDistribution = {
		type: 'doughnut',
		title: 'Task Status Distribution',
		labels: ['To Do', 'In Progress', 'Done'],
		datasets: [
			{
				label: "Tasks",
				data: [todoCount, doingCount, doneCount]
			}
		]
	};

	 // Estimation Accuracy by Module
	const [accuracyRows] = await db.query(
		`SELECT 
			m.id AS module_id,
			m.name AS module_name,
			AVG(CASE 
					WHEN t.etc_minutes > 0 AND t.atc_minutes > 0 
					THEN ABS(CAST(t.atc_minutes AS SIGNED) - CAST(t.etc_minutes AS SIGNED)) / GREATEST(t.etc_minutes, t.atc_minutes)
					ELSE 0 
				END) AS avg_variance
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		WHERE m.semester_id = ? 
			AND t.status = 'done'
			AND t.atc_minutes IS NOT NULL
			AND t.etc_minutes IS NOT NULL
		GROUP BY m.id
		HAVING COUNT(t.id) > 0`,
		[semesterId]
	);

    const moduleAccuracyData = accuracyRows.map(row => ({
		moduleId: row.module_id,
		moduleName: row.module_name,
		accuracy: Math.round(100 - (row.avg_variance * 100))
	}));

	const moduleAccuracyChart = {
		type: 'bar',
		title: 'Estimation Accuracy by Module',
		labels: moduleAccuracyData.map(d => d.moduleName),
		datasets: [
			{
				label: 'Accuracy %',
				data: moduleAccuracyData.map(d => d.accuracy)
			}
		]
	};

    return [taskStatusDistribution, moduleAccuracyChart];
}

async function getStatistics(userId, semesterId) {
	const semester = await getSemester(userId, semesterId);

	const overview = await getOverview(userId, semester.id);
	const analytics = await getAnalytics(userId, semester.id);

	return {
		overview,
		analytics,
		insights: []
	};
}

module.exports = { getStatistics };