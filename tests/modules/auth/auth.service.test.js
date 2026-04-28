process.env.VERIFICATION_CODE_EXPIRATION_MINUTES = "10";

const db = require("../../../database/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const authService = require("../../../modules/auth/auth.service");
const emailService = require("../../../utils/emailService");
const settingsService = require("../../../modules/settings/settings.service");

jest.mock("../../../database/db");
jest.mock("../../../utils/emailService");
jest.mock("../../../modules/settings/settings.service");
jest.mock("bcrypt");

describe("authService", () => {
	let mockConnection;

	beforeEach(() => {
		jest.resetAllMocks();

		mockConnection = {
			query: jest.fn(),
			beginTransaction: jest.fn(),
			commit: jest.fn(),
			rollback: jest.fn(),
			release: jest.fn()
		};

		db.query = jest.fn();
		db.getConnection = jest.fn().mockResolvedValue(mockConnection);

		settingsService.getByUserId = jest.fn();
	});

	describe("startRegistration", () => {
		test("creates a new pending registration", async () => {
			mockConnection.query
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([{ insertId: 1 }]);

			bcrypt.hash.mockResolvedValue("hashedPassword");
			emailService.sendVerificationCode.mockResolvedValue();

			const result = await authService.startRegistration({
				email: "test@example.com",
				forename: "John",
				surname: "Doe",
				password: "password123"
			});

			expect(result.email).toBe("test@example.com");
			expect(result.expiresInMinutes).toBe(10);
		});

		test("throws if email already registered", async () => {
			mockConnection.query.mockResolvedValueOnce([[{ id: 1 }]]);

			await expect(
				authService.startRegistration({
					email: "test@example.com",
					forename: "John",
					surname: "Doe",
					password: "password123"
				})
			).rejects.toThrow("Email already in use.");
		});
	});

	describe("completeRegistration", () => {
		test("completes registration successfully", async () => {
			mockConnection.query
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([[
					{
						id: 1,
						email: "test@example.com",
						forename: "John",
						surname: "Doe",
						password_hash: "hashedPassword",
						verification_code_hash: "hashedCode",
						code_expires_at: new Date(Date.now() + 1000 * 60),
						verification_attempts: 0
					}
				]])
				.mockResolvedValueOnce([{ insertId: 2 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			bcrypt.compare.mockResolvedValue(true);
			settingsService.getByUserId.mockResolvedValue({ theme: "system" });

			const result = await authService.completeRegistration({
				email: "test@example.com",
				code: "123456"
			});

			expect(result.user.email).toBe("test@example.com");
			expect(result.settings.theme).toBe("system");
		});

		test("throws on invalid verification code", async () => {
			mockConnection.query
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([[
					{
						id: 1,
						email: "test@example.com",
						forename: "John",
						surname: "Doe",
						password_hash: "hashedPassword",
						verification_code_hash: "hashedCode",
						code_expires_at: new Date(Date.now() + 1000 * 60),
						verification_attempts: 0
					}
				]])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			bcrypt.compare.mockResolvedValue(false);

			await expect(
				authService.completeRegistration({
					email: "test@example.com",
					code: "wrongCode"
				})
			).rejects.toThrow("Invalid or expired verification code.");
		});
	});

	describe("resendRegistrationCode", () => {
		test("resends verification code successfully", async () => {
			mockConnection.query
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([[
					{
						id: 1,
						email: "test@example.com",
						last_code_sent_at: new Date(Date.now() - 100000),
						resend_count: 0
					}
				]])
				.mockResolvedValueOnce([{ affectedRows: 1 }]);

			bcrypt.hash.mockResolvedValue("hashedCode");
			emailService.sendVerificationCode.mockResolvedValue();

			const result = await authService.resendRegistrationCode({
				email: "test@example.com"
			});

			expect(result.email).toBe("test@example.com");
			expect(result.expiresInMinutes).toBe(10);
		});
	});

    describe("login", () => {
        test("logs in successfully", async () => {
            db.query
                .mockResolvedValueOnce([[
                    {
                        id: 1,
                        email: "test@example.com",
                        forename: "John",
                        surname: "Doe",
                        password_hash: "hashedPassword",
                        role: "user",
                        status: "active",
                        onboarded: 0,
                        failed_login_attempts: 0,
                        last_failed_login_at: null
                    }
                ]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            bcrypt.compare.mockResolvedValue(true);
            settingsService.getByUserId.mockResolvedValue({ theme: "system" });

            const result = await authService.login({
                email: "test@example.com",
                password: "password123"
            });

            expect(result.user.email).toBe("test@example.com");
            expect(result.user.onboarded).toBe(false);
            expect(result.settings.theme).toBe("system");
        });

        test("throws on invalid email", async () => {
            db.query.mockResolvedValueOnce([[]]);

            await expect(
                authService.login({
                    email: "missing@example.com",
                    password: "password123"
                })
            ).rejects.toThrow("Invalid email or password.");
        });

        test("throws on invalid password", async () => {
            db.query
                .mockResolvedValueOnce([[
                    {
                        id: 1,
                        email: "test@example.com",
                        password_hash: "hashedPassword",
                        role: "user",
                        status: "active",
                        onboarded: 0,
                        failed_login_attempts: 0,
                        last_failed_login_at: null
                    }
                ]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            bcrypt.compare.mockResolvedValue(false);

            await expect(
                authService.login({
                    email: "test@example.com",
                    password: "wrong"
                })
            ).rejects.toThrow("Invalid email or password.");
        });

        test("throws if account suspended", async () => {
            db.query.mockResolvedValueOnce([[
                {
                    id: 1,
                    email: "test@example.com",
                    password_hash: "hashedPassword",
                    role: "user",
                    status: "suspended",
                    onboarded: 0,
                    failed_login_attempts: 0,
                    last_failed_login_at: null
                }
            ]]);

            bcrypt.compare.mockResolvedValue(true);

            await expect(
                authService.login({
                    email: "test@example.com",
                    password: "password123"
                })
            ).rejects.toThrow("Account suspended.");
        });
    });

    describe("changePassword", () => {
        test("changes password successfully", async () => {
            db.query
                .mockResolvedValueOnce([[
                    {
                        id: 1,
                        email: "test@example.com",
                        password_hash: "oldHash"
                    }
                ]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue("newHash");
            emailService.sendPasswordChangedNotification.mockResolvedValue();

            await authService.changePassword(1, {
                currentPassword: "oldPassword",
                newPassword: "newPassword"
            });

            expect(bcrypt.hash).toHaveBeenCalledWith("newPassword", expect.any(Number));
            expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith("test@example.com");
        });

        test("throws if user not found", async () => {
            db.query.mockResolvedValueOnce([[]]);

            await expect(
                authService.changePassword(999, {
                    currentPassword: "oldPassword",
                    newPassword: "newPassword"
                })
            ).rejects.toThrow("User not found.");
        });

        test("throws if current password is incorrect", async () => {
            db.query.mockResolvedValueOnce([[
                {
                    id: 1,
                    email: "test@example.com",
                    password_hash: "oldHash"
                }
            ]]);

            bcrypt.compare.mockResolvedValue(false);

            await expect(
                authService.changePassword(1, {
                    currentPassword: "wrongPassword",
                    newPassword: "newPassword"
                })
            ).rejects.toThrow("Current password is incorrect.");
        });
    });

    describe("startPasswordReset", () => {
        test("starts password reset successfully", async () => {
            const crypto = require("crypto");

            jest.spyOn(crypto, "randomBytes").mockReturnValue(Buffer.from("12345678901234567890123456789012"));

            mockConnection.query
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            emailService.sendResetToken.mockResolvedValue();

            await authService.startPasswordReset({
                email: "test@example.com"
            });

            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
            expect(emailService.sendResetToken).toHaveBeenCalled();
        });

        test("returns silently if email does not exist", async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            await authService.startPasswordReset({
                email: "missing@example.com"
            });

            expect(emailService.sendResetToken).not.toHaveBeenCalled();
            expect(mockConnection.commit).not.toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
        });
    });

    describe("isValidPasswordResetToken", () => {
        test("returns true for valid token", async () => {
            db.query.mockResolvedValueOnce([[{ 1: 1 }]]);

            const result = await authService.isValidPasswordResetToken("validToken");

            expect(result).toBe(true);
        });

        test("returns false for invalid token", async () => {
            db.query.mockResolvedValueOnce([[]]);

            const result = await authService.isValidPasswordResetToken("invalidToken");

            expect(result).toBe(false);
        });
    });

    describe("completePasswordReset", () => {
        test("completes password reset successfully", async () => {
            mockConnection.query
                .mockResolvedValueOnce([[
                    {
                        user_id: 1,
                        email: "test@example.com",
                        token_expires_at: new Date(Date.now() + 1000 * 60)
                    }
                ]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            bcrypt.hash.mockResolvedValue("newHash");
            emailService.sendPasswordChangedNotification.mockResolvedValue();

            await authService.completePasswordReset({
                resetToken: "validToken",
                newPassword: "newPassword"
            });

            expect(bcrypt.hash).toHaveBeenCalledWith("newPassword", expect.any(Number));
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
            expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith("test@example.com");
        });

        test("throws if reset token is invalid", async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            await expect(
                authService.completePasswordReset({
                    resetToken: "invalidToken",
                    newPassword: "newPassword"
                })
            ).rejects.toThrow("Invalid or expired password reset token.");

            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
        });

        test("throws if reset token is expired", async () => {
            mockConnection.query.mockResolvedValueOnce([[
                {
                    user_id: 1,
                    email: "test@example.com",
                    token_expires_at: new Date(Date.now() - 1000 * 60)
                }
            ]]);

            await expect(
                authService.completePasswordReset({
                    resetToken: "expiredToken",
                    newPassword: "newPassword"
                })
            ).rejects.toThrow("Invalid or expired password reset token.");

            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
        });
    });
});