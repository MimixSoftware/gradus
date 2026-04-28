const db = require("../../../database/db");
const moduleService = require("../../../modules/modules/module.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../database/db");

describe("module.service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findAll", () => {
		test("returns mapped modules", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						semester_id: 2,
						name: "Math",
						credits: 5,
						colour: "red",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await moduleService.findAll(1);

			expect(db.query).toHaveBeenCalledTimes(1);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 1,
				semesterId: 2,
				name: "Math"
			});
		});
	});

	describe("findAllBySemester", () => {
		test("returns modules in a semester", async () => {
			db.query.mockResolvedValue([
				[
					{
						id: 1,
						semester_id: 2,
						name: "Physics",
						credits: 4,
						colour: "blue",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await moduleService.findAllBySemester(1, 2);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Physics");
		});
	});

	describe("findById", () => {
		test("returns module if found", async () => {
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						semester_id: 2,
						name: "Chemistry",
						credits: 3,
						colour: "green",
						created_at: "2024-01-01",
						updated_at: "2024-01-02"
					}
				]
			]);

			const result = await moduleService.findById(1, 1);

			expect(result.id).toBe(1);
			expect(result.name).toBe("Chemistry");
		});

		test("throws if module not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(moduleService.findById(1, 999)).rejects.toThrow(AppError);
		});
	});

	describe("createInSemester", () => {
		test("creates module successfully", async () => {
			db.query.mockResolvedValueOnce([[{ 1: 1 }]]);
			db.query.mockResolvedValueOnce([{ insertId: 5 }]);
			db.query.mockResolvedValueOnce([
				[
					{
						id: 5,
						semester_id: 2,
						name: "New Module",
						credits: 4,
						colour: "yellow",
						created_at: "now",
						updated_at: "now"
					}
				]
			]);

			const result = await moduleService.createInSemester(1, 2, {
				name: "New Module",
				credits: 4,
				colour: "yellow"
			});

			expect(result.id).toBe(5);
			expect(result.name).toBe("New Module");
		});

		test("throws if semester not found", async () => {
			db.query.mockResolvedValueOnce([[]]);

			await expect(
				moduleService.createInSemester(1, 2, { name: "Test", credits: 3, colour: "red" })
			).rejects.toThrow("Semester not found.");
		});
	});

	describe("update", () => {
		test("updates module successfully", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
			db.query.mockResolvedValueOnce([
				[
					{
						id: 1,
						semester_id: 2,
						name: "Updated Module",
						credits: 5,
						colour: "purple",
						created_at: "now",
						updated_at: "now"
					}
				]
			]);

			const result = await moduleService.update(1, 1, {
				name: "Updated Module",
				credits: 5,
				colour: "purple"
			});

			expect(result.name).toBe("Updated Module");
			expect(result.credits).toBe(5);
		});

		test("throws if module not found", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

			await expect(
				moduleService.update(1, 1, { name: "No Module" })
			).rejects.toThrow("Module not found.");
		});
	});

	describe("remove", () => {
		test("deletes module successfully", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

			await expect(moduleService.remove(1, 1)).resolves.toBeUndefined();
		});

		test("throws if module not found", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

			await expect(moduleService.remove(1, 1)).rejects.toThrow("Module not found.");
		});
	});
});