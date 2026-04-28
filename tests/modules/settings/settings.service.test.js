const fs = require("fs/promises")
const sharp = require("sharp")
const settingsService = require("../../../modules/settings/settings.service")
const db = require("../../../database/db")

jest.mock("../../../database/db")
jest.mock("fs/promises")
jest.mock("sharp")

describe("settingsService", () => {
	describe("getByUserId", () => {
		test("returns user settings", async () => {
			db.query.mockResolvedValueOnce([[
				{
					forename: "John",
					surname: "Doe",
					onboarded: 1,
					tutorial_completed: 0,
					active_semester_id: 3,
					theme: "dark"
				}
			]])
			const result = await settingsService.getByUserId(1)
			expect(result.forename).toBe("John")
			expect(result.onboarded).toBe(true)
		})

		test("throws if not found", async () => {
			db.query.mockResolvedValueOnce([[]])
			await expect(settingsService.getByUserId(99)).rejects.toThrow("Settings not found.")
		})
	})

	describe("getAvatarPath", () => {
		test("returns avatar path if exists", async () => {
			fs.access.mockResolvedValueOnce()
			const path = await settingsService.getAvatarPath(1)
			expect(path).toContain("1.webp")
		})

		test("returns default if missing", async () => {
			fs.access.mockRejectedValueOnce(new Error())
			const path = await settingsService.getAvatarPath(99)
			expect(path).toContain("0.webp")
		})
	})

	describe("update", () => {
		let conn
		beforeEach(() => {
			conn = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
			}
			db.getConnection.mockResolvedValue(conn)
		})

		test("updates user and settings", async () => {
			const conn = {
				beginTransaction: jest.fn(),
				commit: jest.fn(),
				rollback: jest.fn(),
				release: jest.fn(),
				query: jest.fn()
			};
			db.getConnection = jest.fn().mockResolvedValue(conn);

			conn.query
				.mockResolvedValueOnce([[{ affectedRows: 1 }], undefined])
				.mockResolvedValueOnce([[{ affectedRows: 1 }], undefined]);

			db.query = jest.fn().mockResolvedValueOnce([[
				{
					id: 1,
					email: "a@b.com",
					forename: "John",
					surname: "Doe",
					role: "user",
					status: "active",
					onboarded: 1,
					tutorial_completed: 0,
					active_semester_id: 2,
					theme: "dark"
				}
			], undefined]);

			const result = await settingsService.update(1, { forename: "John" });

			expect(result.user.forename).toBe("John");
		});

		test("rolls back on error", async () => {
			conn.query.mockRejectedValueOnce(new Error("fail"))
			await expect(settingsService.update(1, { forename: "X" })).rejects.toThrow("fail")
			expect(conn.rollback).toHaveBeenCalled()
			expect(conn.release).toHaveBeenCalled()
		})
	})

	describe("updateAvatar", () => {
		test("processes avatar", async () => {
			fs.mkdir.mockResolvedValueOnce()
			const toFile = jest.fn().mockResolvedValueOnce()
			sharp.mockReturnValue({ resize: () => ({ webp: () => ({ toFile }) }) })
			await settingsService.updateAvatar(1, { buffer: Buffer.from([]) })
			expect(toFile).toHaveBeenCalled()
		})

		test("throws if no file", async () => {
			await expect(settingsService.updateAvatar(1, null)).rejects.toThrow("No avatar file uploaded.")
		})
	})

	describe("deleteAvatar", () => {
		test("deletes existing", async () => {
			fs.unlink.mockResolvedValueOnce()
			await settingsService.deleteAvatar(1)
			expect(fs.unlink).toHaveBeenCalled()
		})

		test("ignores if missing", async () => {
			const err = new Error()
			err.code = "ENOENT"
			fs.unlink.mockRejectedValueOnce(err)
			await expect(settingsService.deleteAvatar(1)).resolves.not.toThrow()
		})
	})

	describe("completeOnboarding", () => {
		test("completes successfully", async () => {
			db.query
				.mockResolvedValueOnce([[{ id: 1 }]]) 
				.mockResolvedValueOnce([[{ id: 1 }]])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([[
					{
						id: 1, email: "a@b.com", forename: "John", surname: "Doe",
						role: "user", status: "active", onboarded: 1, tutorial_completed: 0,
						active_semester_id: 2, theme: "dark"
					}
				]])
			const result = await settingsService.completeOnboarding(1)
			expect(result.user.onboarded).toBe(true)
		})

		test("throws if no semesters", async () => {
			db.query.mockResolvedValueOnce([[]])
			await expect(settingsService.completeOnboarding(1)).rejects.toThrow(/at least one semester/)
		})
	})

	describe("completeTutorial", () => {
		test("marks tutorial completed", async () => {
			db.query
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([[
					{
						id: 1, email: "a@b.com", forename: "John", surname: "Doe",
						role: "user", status: "active", onboarded: 1, tutorial_completed: 1,
						active_semester_id: 2, theme: "dark"
					}
				]])
			const result = await settingsService.completeTutorial(1)
			expect(result.user.tutorialCompleted).toBe(true)
		})
	})
})