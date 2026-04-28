const db = require("../../../database/db");
const studySessionService = require("../../../modules/studySessions/studySession.service");

describe("studySessionService", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		db.query = jest.fn();
	});

	describe("createInSemester", () => {
		test("creates a study session successfully", async () => {
			db.query
				.mockResolvedValueOnce([[{ 1: 1 }]]) 
				.mockResolvedValueOnce([[]]) 
				.mockResolvedValueOnce([{ insertId: 10 }])
				.mockResolvedValueOnce([[
					{
						id: 10,
						semester_id: 2,
						day_of_week: 1,
						start_time: "09:00",
						duration_minutes: 60,
						created_at: "now",
						updated_at: "now"
					}
				]]);

			const result = await studySessionService.createInSemester(1, 2, {
				dayOfWeek: 1,
				startTime: "09:00",
				durationMinutes: 60
			});

			expect(result.id).toBe(10);
			expect(result.dayOfWeek).toBe(1);
			expect(result.startTime).toBe("09:00");
			expect(result.durationMinutes).toBe(60);
		});

		test("throws if semester not found", async () => {
			db.query.mockResolvedValueOnce([[]]);
			await expect(studySessionService.createInSemester(1, 2, {
				dayOfWeek: 1,
				startTime: "09:00",
				durationMinutes: 60
			})).rejects.toThrow("Semester not found.");
		});

		test("throws if session spills over to next day", async () => {
			db.query.mockResolvedValueOnce([[{ 1: 1 }]]);
			await expect(studySessionService.createInSemester(1, 2, {
				dayOfWeek: 1,
				startTime: "23:30",
				durationMinutes: 90
			})).rejects.toThrow("Study session cannot spill into the next day.");
		});

		test("throws if session overlaps existing session", async () => {
			db.query
				.mockResolvedValueOnce([[{ 1: 1 }]]) 
				.mockResolvedValueOnce([[{ id: 5 }]]); 
			await expect(studySessionService.createInSemester(1, 2, {
				dayOfWeek: 1,
				startTime: "10:00",
				durationMinutes: 60
			})).rejects.toThrow("Study session overlaps with an existing session.");
		});
	});

	describe("update", () => {
		test("updates successfully", async () => {
			db.query
				.mockResolvedValueOnce([[
					{
						id: 10,
						semester_id: 2,
						day_of_week: 1,
						start_time: "09:00",
						duration_minutes: 60,
						created_at: "now",
						updated_at: "now"
					}
				]])
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([[
					{
						id: 10,
						semester_id: 2,
						day_of_week: 2,
						start_time: "10:00",
						duration_minutes: 90,
						created_at: "now",
						updated_at: "now"
					}
				]]);

			const result = await studySessionService.update(1, 10, {
				dayOfWeek: 2,
				startTime: "10:00",
				durationMinutes: 90
			});

			expect(result.dayOfWeek).toBe(2);
			expect(result.startTime).toBe("10:00");
			expect(result.durationMinutes).toBe(90);
		});

		test("throws if study session not found", async () => {
			db.query.mockResolvedValueOnce([[]]);
			await expect(studySessionService.update(1, 10, { dayOfWeek: 2 })).rejects.toThrow("Study session not found.");
		});

		test("throws if no fields provided", async () => {
			db.query.mockResolvedValueOnce([[
				{ id: 10, semester_id: 2, day_of_week: 1, start_time: "09:00", duration_minutes: 60, created_at: "now", updated_at: "now" }
			]]).mockResolvedValueOnce([[]]);
			await expect(studySessionService.update(1, 10, {})).rejects.toThrow("At least one field is required.");
		});
	});

	describe("remove", () => {
		test("deletes successfully", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
			await expect(studySessionService.remove(1, 10)).resolves.toBeUndefined();
		});

		test("throws if session not found", async () => {
			db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
			await expect(studySessionService.remove(1, 10)).rejects.toThrow("Study session not found.");
		});
	});

	describe("findAll and findAllBySemester", () => {
		test("returns all sessions", async () => {
			db.query.mockResolvedValueOnce([[
				{ id: 1, semester_id: 2, day_of_week: 1, start_time: "09:00", duration_minutes: 60, created_at: "now", updated_at: "now" }
			]]);

			const result = await studySessionService.findAll(1);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});

		test("returns sessions by semester", async () => {
			db.query.mockResolvedValueOnce([[
				{ id: 1, semester_id: 2, day_of_week: 1, start_time: "09:00", duration_minutes: 60, created_at: "now", updated_at: "now" }
			]]);

			const result = await studySessionService.findAllBySemester(1, 2);
			expect(result).toHaveLength(1);
			expect(result[0].semesterId).toBe(2);
		});
	});
});