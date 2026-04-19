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
	const [taskStatusRows] = await db.query(
		`SELECT 
			SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_count,
			SUM(CASE WHEN t.status = 'doing' THEN 1 ELSE 0 END) AS doing_count,
			SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE a.status = 'active'
		AND s.id = ?
		AND s.user_id = ?`,
		[semesterId, userId]
	);

	const todoCount = taskStatusRows[0].todo_count;
	const doingCount = taskStatusRows[0].doing_count;
	const doneCount = taskStatusRows[0].done_count;

	const taskStatusDistribution = {
		type: 'doughnut',
		title: 'Task Status Distribution',
		labels: ['To Do', 'In Progress', 'Done'],
		datasets: [
			{
				label: "Tasks",
				data: [todoCount, doingCount, doneCount],
				backgroundColor: [
					'#FFCE56',
					'#36A2EB',
					'#4BC0C0'
				],
				borderColor: [
					'#FFC107',
					'#007BFF',
					'#20C997'
				],
				borderWidth: 1
			}
		]
	};

	// Assignment Status Distribution
	const [assignmentStatusRows] = await db.query(
		`SELECT
			SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) AS active_count,
			SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
		FROM assignments a
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE s.id = ?
		AND s.user_id = ?`,
		[semesterId, userId]
	);

	const activeAssignments = assignmentStatusRows[0].active_count;
	const completedAssignments = assignmentStatusRows[0].completed_count;

	const assignmentStatusDistribution = {
		type: 'doughnut',
		title: 'Assignment Status Distribution',
		labels: ['Active', 'Completed'],
		datasets: [
			{
				label: "Assignments",
				data: [activeAssignments, completedAssignments],
				backgroundColor: [
					'#36A2EB',
					'#4BC0C0'
				],
				borderColor: [
					'#007BFF',
					'#20C997'
				],
				borderWidth: 1
			}
		]
	};

	// Time Spent by Module
	const [timeByModuleRows] = await db.query(
		`SELECT 
			m.id AS module_id,
			m.name AS module_name,
			m.colour AS module_colour,
			SUM(t.atc_minutes) AS total_time
		FROM tasks t
		INNER JOIN assignments a ON a.id = t.assignment_id
		INNER JOIN modules m ON m.id = a.module_id
		INNER JOIN semesters s ON s.id = m.semester_id
		WHERE t.atc_minutes IS NOT NULL
		AND s.id = ?
		AND s.user_id = ?
		GROUP BY m.id, m.name, m.colour
		ORDER BY total_time DESC`,
		[semesterId, userId]
	);

	const labels = timeByModuleRows.map(row => row.module_name);
	const data = timeByModuleRows.map(row => row.total_time);
	const backgroundColor = timeByModuleRows.map(row => row.module_colour);

	const timeByModuleChart = {
		type: 'pie',
		title: 'Time Spent by Module (minutes)',
		labels,
		datasets: [
			{
				label: "Time Spent",
				data,
				backgroundColor,
				borderColor: backgroundColor.map(c => c),
				borderWidth: 1
			}
		]
	};

    return [taskStatusDistribution, assignmentStatusDistribution, timeByModuleChart];
}

function getInsights(overview, analytics) {
	const insights = [];

	const activeAssignments = overview.find(item => item.key === 'activeAssignments').value;
	const completedAssignments = overview.find(item => item.key === 'completedAssignments').value;
	const accuracyPercent = overview.find(item => item.key === 'accuracyPercent').value;

	const taskChart = analytics.find(chart => chart.title === 'Task Status Distribution');
	const [todoCount, doingCount, doneCount] = taskChart.datasets[0].data;

	// Task Status insights
	const totalTasks = todoCount + doingCount + doneCount;
	if (totalTasks > 0) {
		const doingPercent = (doingCount / totalTasks) * 100;
		const todoPercent = (todoCount / totalTasks) * 100;

		if (doingPercent > 50) {
			insights.push("More than half of your tasks are in progress. Consider prioritising or breaking them into smaller steps.");
		}
		if (todoPercent > 50) {
			insights.push("You have a lot of tasks pending. Time to plan and start tackling them!");
		}
		if (doneCount === 0) {
			insights.push("No tasks have been completed yet. Focus on finishing tasks to make progress.");
		}
	}

	// Assignment insights
	const totalAssignments = activeAssignments + completedAssignments;
	if (totalAssignments > 0) {
		const activePercent = (activeAssignments / totalAssignments) * 100;
		if (activePercent > 70) {
			insights.push("Most of your assignments are still active. Make sure to schedule time for completion.");
		}
		if (completedAssignments === totalAssignments) {
			insights.push("All assignments are completed. Great job staying on top of your work!");
		}
	}

	// Estimation accuracy insights
	if (accuracyPercent) {
		if (accuracyPercent < 90) {
			insights.push("Your estimation accuracy is below 90%, meaning you often underestimate task time.");
		} else if (accuracyPercent > 110) {
			insights.push("Your estimation accuracy is above 110%, meaning you often overestimate task time.");
		} else {
			insights.push("Your task time estimates are well-calibrated.");
		}
	}

	// No tasks or assignments insight
	if (totalTasks === 0 && totalAssignments === 0) {
		insights.push("No tasks or assignments recorded for this semester yet.");
	}

	return insights;
}

async function getStatistics(userId, semesterId) {
	const semester = await getSemester(userId, semesterId);

	const overview = await getOverview(userId, semester.id);
	const analytics = await getAnalytics(userId, semester.id);
	const insights = getInsights(overview, analytics);

	return {
		overview,
		analytics,
		insights
	};
}

module.exports = { getStatistics };