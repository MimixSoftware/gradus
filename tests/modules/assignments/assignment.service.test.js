const db = require("../../../database/db");
const assignmentService = require("../../../modules/assignments/assignment.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../database/db");

describe("assignment.service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findAll", () => {
		test("returns mapped assignments", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						module_id: 10,
						name: "Test",
						description: "Desc",
						status: "active",
						weight: 50,
						confidence: 3,
						deadline: "2024-01-01",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await assignmentService.findAll(1);

			expect(db.query).toHaveBeenCalledTimes(1);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 1,
				moduleId: 10,
				name: "Test"
			});
		});
	});

	describe("findById", () => {
		test("returns assignment if found", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						module_id: 10,
						name: "Test",
						description: null,
						status: "active",
						weight: null,
						confidence: null,
						deadline: null,
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await assignmentService.findById(1, 1);

			expect(result.id).toBe(1);
			expect(result.name).toBe("Test");
		});

		test("throws if not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				assignmentService.findById(1, 999)
			).rejects.toThrow(AppError);
		});
	});

	describe("createInModule", () => {
		test("creates assignment successfully", async () => {
			db.query.mockResolvedValueOnce([[{ 1: 1 }]]);
			db.query.mockResolvedValueOnce([{ insertId: 5 }]);
			db.query.mockResolvedValueOnce([
				[
					{
						id: 5,
						module_id: 10,
						name: "New",
						description: null,
						status: "active",
						weight: null,
						confidence: null,
						deadline: null,
						created_at: "now",
						updated_at: "now"
					}
				]
			]);

			const result = await assignmentService.createInModule(1, 10, {
				name: "New",
				description: null,
				weight: null,
				confidence: null,
				deadline: null
			});

			expect(result.id).toBe(5);
		});

		test("throws if module not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				assignmentService.createInModule(1, 10, {
					name: "Test"
				})
			).rejects.toThrow("Module not found.");
		});
	});

	describe("update", () => {
		test("updates name successfully", async () => {
			db.query.mockResolvedValueOnce([
				[{ id: 1, module_id: 10, status: "active" }]
			]);
			db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						module_id: 10,
						name: "Updated",
						description: null,
						status: "active",
						weight: null,
						confidence: null,
						deadline: null,
						created_at: "now",
						updated_at: "now"
					}
				]
			]);

			const result = await assignmentService.update(1, 1, {
				name: "Updated"
			});

			expect(result.name).toBe("Updated");
		});

		test("throws if no fields provided", async () => {
			db.query.mockResolvedValueOnce([
				[{ id: 1, module_id: 10, status: "active" }]
			]);

			await expect(
				assignmentService.update(1, 1, {})
			).rejects.toThrow("At least one field is required.");
		});
	});

	describe("remove", () => {
		test("deletes assignment", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

			await expect(
				assignmentService.remove(1, 1)
			).resolves.toBeUndefined();

			expect(db.query).toHaveBeenCalledTimes(1);
		});

		test("throws if not found", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

			await expect(
				assignmentService.remove(1, 1)
			).rejects.toThrow("Assignment not found.");
		});
	});
});