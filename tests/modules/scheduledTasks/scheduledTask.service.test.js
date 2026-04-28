const db = require("../../../database/db");
const scheduledTaskService = require("../../../modules/scheduledTasks/scheduledTask.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../database/db");

describe("scheduledTaskService", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findAll", () => {
		test("returns mapped scheduled tasks", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0,
						duration_minutes: 60,
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await scheduledTaskService.findAll(1);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 1,
				taskId: 10,
				studySessionId: 5
			});
		});
	});

	describe("findById", () => {
		test("returns scheduled task if found", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0,
						duration_minutes: 60,
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await scheduledTaskService.findById(1, 1);

			expect(result.id).toBe(1);
			expect(result.taskId).toBe(10);
		});

		test("throws if scheduled task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(scheduledTaskService.findById(1, 999)).rejects.toThrow(AppError);
		});
	});

	describe("createInStudySession", () => {
		test("creates scheduled task successfully", async () => {
			const mockConnection = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
			};

			db.getConnection.mockResolvedValue(mockConnection);

			db.query
				.mockResolvedValueOnce([[
					{
						day_of_week: 0,
						session_duration_minutes: 120,
						semester_start_date: "2024-01-01",
						semester_end_date: "2024-12-31"
					}
				]])
				.mockResolvedValueOnce([[
					{ etc_minutes: 120 }
				]])
				.mockResolvedValueOnce([[
					{ total: 0 }
				]])
				.mockResolvedValueOnce([[
					{ etc_minutes: 120 }
				]])
				.mockResolvedValueOnce([[
					{ session_duration_minutes: 120 }
				]])
				.mockResolvedValueOnce([
					[]
				])
				.mockResolvedValueOnce([[
					{
						id: 5,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0,
						duration_minutes: 60,
						created_at: "now",
						updated_at: "now"
					}
				]]);

			mockConnection.query
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([{}])
				.mockResolvedValueOnce([{}])
				.mockResolvedValueOnce([{ insertId: 5 }]);

			const result = await scheduledTaskService.createInStudySession(1, 5, {
				taskId: 10,
				sessionDate: "2024-01-01",
				position: 0,
				durationMinutes: 60
			});

			expect(result.id).toBe(5);
			expect(result.taskId).toBe(10);
			expect(result.durationMinutes).toBe(60);

			expect(mockConnection.beginTransaction).toHaveBeenCalled();
			expect(mockConnection.commit).toHaveBeenCalled();
			expect(mockConnection.rollback).not.toHaveBeenCalled();
			expect(mockConnection.release).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		test("updates scheduled task successfully", async () => {
			const mockConnection = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
			};

			db.getConnection.mockResolvedValue(mockConnection);

			db.query
				.mockResolvedValueOnce([[
					{
						id: 5,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0,
						duration_minutes: 60,
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]])
				.mockResolvedValueOnce([[
					{ session_duration_minutes: 120 }
				]])
				.mockResolvedValueOnce([[
					{ total: 30 }
				]])
				.mockResolvedValueOnce([[
					{ etc_minutes: 120 }
				]])
				.mockResolvedValueOnce([[
					{ session_duration_minutes: 120 }
				]])
				.mockResolvedValueOnce([
					[]
				])
				.mockResolvedValueOnce([[
					{
						id: 5,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0,
						duration_minutes: 90,
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]]);

			mockConnection.query
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			const result = await scheduledTaskService.update(1, 5, {
				position: 1,
				durationMinutes: 90
			});

			expect(result.position).toBe(0);
			expect(result.durationMinutes).toBe(90);

			expect(mockConnection.beginTransaction).toHaveBeenCalled();
			expect(mockConnection.commit).toHaveBeenCalled();
			expect(mockConnection.rollback).not.toHaveBeenCalled();
			expect(mockConnection.release).toHaveBeenCalled();
		});

		test("throws if scheduled task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				scheduledTaskService.update(1, 999, { position: 1 })
			).rejects.toThrow(AppError);
		});
	});

	describe("remove", () => {
		test("deletes scheduled task successfully", async () => {
			const mockConnection = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
					.mockResolvedValueOnce([[{
						id: 5,
						task_id: 10,
						study_session_id: 5,
						session_date: "2024-01-01",
						position: 0
					}]])
					.mockResolvedValueOnce([{ affectedRows: 1 }])
					.mockResolvedValueOnce([])
			};

			db.getConnection.mockResolvedValue(mockConnection);

			await expect(scheduledTaskService.remove(1, 5)).resolves.toBeUndefined();
			expect(mockConnection.beginTransaction).toHaveBeenCalled();
			expect(mockConnection.commit).toHaveBeenCalled();
			expect(mockConnection.release).toHaveBeenCalled();
		});

		test("throws if scheduled task not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(scheduledTaskService.remove(1, 999)).rejects.toThrow(AppError);
		});
	});
});