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
	// Active Assignments Count
	const [activeAssignmentsRows] = await db.query(
		`SELECT COUNT(*) AS active_count
		 FROM assignments a
		 INNER JOIN modules m ON m.id = a.module_id
		 WHERE m.semester_id = ? 
		   AND a.status = 'active'
		   AND m.semester_id IN (SELECT s.id FROM semesters s WHERE s.user_id = ?)`,

		[semesterId, userId]
	);

	// Estimation Accuracy (for completed tasks)
	const [estimationRows] = await db.query(
		`SELECT 
			COUNT(*) AS completed_count,
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
			AND m.semester_id IN (SELECT s.id FROM semesters s WHERE s.user_id = ?)`,
		[semesterId, userId]
	);

	const activeAssignments = activeAssignmentsRows[0]?.active_count || 0;
	const completedCount = estimationRows[0]?.completed_count || 0;
	const avgVariance = estimationRows[0]?.avg_variance || 0;

	let estimationAccuracy = 100;
	if (completedCount > 0) {
		estimationAccuracy = Math.round(Math.max(0, 100 - (avgVariance * 100)));
	}

	return [
		{ key: 'activeAssignments', label: 'Active Assignments', value: activeAssignments },
		{ key: 'estimationAccuracy', label: 'Estimation Accuracy (%)', value: estimationAccuracy }
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