const db = require("../../../database/db");
const semesterService = require("../../../modules/semesters/semester.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../database/db");

describe("semester.service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findAll", () => {
		test("returns mapped semesters", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						user_id: 1,
						name: "Spring 2024",
						start_date: "2024-01-01",
						end_date: "2024-06-01",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await semesterService.findAll(1);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 1,
				userId: 1,
				name: "Spring 2024"
			});
		});
	});

	describe("findById", () => {
		test("returns semester if found", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						user_id: 1,
						name: "Fall 2024",
						start_date: "2024-09-01",
						end_date: "2025-01-01",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await semesterService.findById(1, 1);

			expect(result.id).toBe(1);
			expect(result.name).toBe("Fall 2024");
		});

		test("throws if semester not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(semesterService.findById(1, 999)).rejects.toThrow(AppError);
		});
	});

	describe("create", () => {
		test("creates semester successfully", async () => {
			const mockConnection = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
			};

			db.getConnection.mockResolvedValue(mockConnection);

			db.query.mockResolvedValueOnce([[]]);

			mockConnection.query
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([{ insertId: 5 }]);

			db.query.mockResolvedValueOnce([
				[
					{
						id: 5,
						user_id: 1,
						name: "New Semester",
						start_date: "2024-01-01",
						end_date: "2024-06-01",
						created_at: "now",
						updated_at: "now"
					}
				]
			]);

			const result = await semesterService.create(1, {
				name: "New Semester",
				startDate: "2024-01-01",
				endDate: "2024-06-01"
			});

			expect(result.id).toBe(5);
			expect(mockConnection.commit).toHaveBeenCalled();
			expect(mockConnection.release).toHaveBeenCalled();
		});

		test("throws if overlap check fails", async () => {
			db.query.mockResolvedValueOnce([[{ 1: 1 }]]);

			await expect(
				semesterService.create(1, {
					name: "Overlap Semester",
					startDate: "2024-01-01",
					endDate: "2024-06-01"
				})
			).rejects.toThrow("Semester dates overlap with an existing semester.");
		});
	});

	describe("update", () => {
		test("updates semester successfully", async () => {
			db.query
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([[{ count: 0 }]])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([
					[
						{
							id: 1,
							user_id: 1,
							name: "Updated Semester",
							start_date: "2024-02-01",
							end_date: "2024-07-01",
							created_at: "2024-01-01",
							updated_at: "2024-01-02"
						}
					]
				]);

			const result = await semesterService.update(1, 1, {
				name: "Updated Semester",
				startDate: "2024-02-01",
				endDate: "2024-07-01"
			});

			expect(result.name).toBe("Updated Semester");
		});

		test("throws if semester not found", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

			await expect(
				semesterService.update(1, 1, { name: "No Semester" })
			).rejects.toThrow("Semester not found.");
		});
	});

	describe("remove", () => {
		test("deletes semester successfully", async () => {
			db.query
				.mockResolvedValueOnce([[{ count: 2 }]])
				.mockResolvedValueOnce([[{ active_semester_id: 999 }]])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			await expect(semesterService.remove(1, 1)).resolves.toBeUndefined();
		});

		test("throws if deleting active semester", async () => {
			db.query
				.mockResolvedValueOnce([[{ count: 2 }]])
				.mockResolvedValueOnce([[{ active_semester_id: 1 }]]);

			await expect(semesterService.remove(1, 1)).rejects.toThrow(
				"Active semester cannot be deleted"
			);
		});

		test("throws if only one semester left", async () => {
			db.query
				.mockResolvedValueOnce([[{ count: 1 }]])
				.mockResolvedValueOnce([[{ active_semester_id: 999 }]]);

			await expect(semesterService.remove(1, 1)).rejects.toThrow(
				"You must keep at least one semester."
			);
		});

		test("throws if semester not found", async () => {
			db.query
				.mockResolvedValueOnce([[{ count: 2 }]])
				.mockResolvedValueOnce([[{ active_semester_id: 999 }]])
				.mockResolvedValueOnce([{ affectedRows: 0 }]);

			await expect(semesterService.remove(1, 1)).rejects.toThrow(
				"Semester not found."
			);
		});
	});
});