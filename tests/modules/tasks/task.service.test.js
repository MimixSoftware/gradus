const db = require("../../../database/db");
const taskEstimationService = require("../../../modules/tasks/taskEstimation.service");
const taskService = require("../../../modules/tasks/task.service");

jest.mock("../../../database/db");
jest.mock("../../../modules/tasks/taskEstimation.service");

describe("task.service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findAll", () => {
		test("returns mapped tasks", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						assignment_id: 2,
						name: "Task 1",
						description: "Desc",
						status: "todo",
						deadline: "2024-01-01",
						etc_minutes: 60,
						atc_minutes: null,
						created_at: "2024-01-01",
						updated_at: "2024-01-01"
					}
				]
			]);

			const result = await taskService.findAll(1);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Task 1");
		});
	});

	describe("findById", () => {
		test("returns task if found", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						assignment_id: 2,
						name: "Task 1",
						description: "Desc",
						status: "todo",
						deadline: "2024-01-01",
						etc_minutes: 60,
						atc_minutes: null,
						created_at: "2024-01-01",
						updated_at: "2024-01-01"
					}
				]
			]);

			const task = await taskService.findById(1, 1);
			expect(task.id).toBe(1);
			expect(task.name).toBe("Task 1");
		});

		test("throws if task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(taskService.findById(1, 999)).rejects.toThrow("Task not found.");
		});
	});

	describe("createInAssignment", () => {
		test("creates task successfully", async () => {
			db.query
				.mockResolvedValueOnce([[{ 1: 1 }]])
				.mockResolvedValueOnce([
					[
						{
							start_date: "2024-01-01",
							end_date: "2024-06-01"
						}
					]
				])
				.mockResolvedValueOnce([{ insertId: 5 }])
				.mockResolvedValueOnce([
					[
						{
							id: 5,
							assignment_id: 2,
							name: "New Task",
							description: "Desc",
							status: "todo",
							deadline: "2024-01-01",
							etc_minutes: 60,
							atc_minutes: null,
							created_at: "now",
							updated_at: "now"
						}
					]
				]);

			const result = await taskService.createInAssignment(1, 2, {
				name: "New Task",
				description: "Desc",
				deadline: "2024-01-01",
				etcMinutes: 60
			});

			expect(result.id).toBe(5);
			expect(result.name).toBe("New Task");
		});

		test("throws if assignment not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				taskService.createInAssignment(1, 999, {
					name: "Fail Task",
					description: "Desc",
					deadline: "2024-01-01",
					etcMinutes: 60
				})
			).rejects.toThrow("Assignment not found.");
		});
	});

	describe("update", () => {
		test("updates task successfully", async () => {
			db.query
				.mockResolvedValueOnce([
					[
						{ id: 1, assignment_id: 2, status: "todo", assignment_status: "open" }
					]
				])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([
					[
						{
							id: 1,
							assignment_id: 2,
							name: "Updated Task",
							description: "Desc",
							status: "done",
							deadline: "2024-01-01",
							etc_minutes: 60,
							atc_minutes: 15,
							created_at: "2024-01-01",
							updated_at: "now"
						}
					]
				]);

			const result = await taskService.update(1, 1, {
				name: "Updated Task",
				status: "done",
				atcMinutes: 15
			});

			expect(result.name).toBe("Updated Task");
			expect(result.status).toBe("done");
			expect(result.atcMinutes).toBe(15);
		});

		test("throws if task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(taskService.update(1, 999, { name: "Fail" })).rejects.toThrow("Task not found.");
		});
	});

	describe("remove", () => {
		test("deletes task successfully", async () => {
			db.query
				.mockResolvedValueOnce([[{ assignment_status: "open" }]])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			await expect(taskService.remove(1, 1)).resolves.toBeUndefined();
		});

		test("throws if task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(taskService.remove(1, 999)).rejects.toThrow("Task not found.");
		});

		test("throws if assignment completed", async () => {
			db.query.mockResolvedValueOnce([[{ assignment_status: "completed" }]]);

			await expect(taskService.remove(1, 1)).rejects.toThrow(
				"Cannot delete tasks in a completed assignment. Reopen the assignment first."
			);
		});
	});

	describe("estimate", () => {
		test("returns estimated minutes", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						assignment_name: "Assignment 1",
						assignment_description: "Desc",
						assignment_confidence: 80,
						assignment_weight: 1
					}
				]
			]);

			taskEstimationService.estimateTaskMinutes.mockResolvedValue(15);

			const minutes = await taskService.estimate(1, {
				assignmentId: 2,
				taskName: "Task 1",
				taskDescription: "Desc"
			});

			expect(minutes).toBe(15);
		});

		test("throws if assignment not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				taskService.estimate(1, { assignmentId: 999, taskName: "Fail", taskDescription: "Desc" })
			).rejects.toThrow("Assignment not found.");
		});
	});
});