const authValidation = require('../../../modules/auth/auth.validation');

describe('auth.validation', () => {
	describe('validateStartRegistrationInput', () => {
		test('valid input returns normalised object', () => {
			const result = authValidation.validateStartRegistrationInput({
				email: 'TEST@Email.com',
				forename: ' John ',
				surname: ' Doe ',
				password: 'password123',
				confirmPassword: 'password123'
			});

			expect(result.email).toBe('test@email.com');
			expect(result.forename).toBe('John');
			expect(result.surname).toBe('Doe');
		});

		test('throws if passwords do not match', () => {
			expect(() =>
				authValidation.validateStartRegistrationInput({
					email: 'test@email.com',
					forename: 'John',
					password: 'password123',
					confirmPassword: 'different'
				})
			).toThrow('Passwords do not match');
		});

		test('sets optional surname to null when missing', () => {
			const result = authValidation.validateStartRegistrationInput({
				email: 'test@email.com',
				forename: 'John',
				password: 'password123',
				confirmPassword: 'password123'
			});

			expect(result.surname).toBeNull();
		});
	});

	describe('validateCompleteRegistrationInput', () => {
		test('valid input passes', () => {
			const result = authValidation.validateCompleteRegistrationInput({
				email: 'test@email.com',
				code: '123456'
			});

			expect(result.email).toBe('test@email.com');
			expect(result.code).toBe('123456');
		});

		test('rejects invalid verification code', () => {
			expect(() =>
				authValidation.validateCompleteRegistrationInput({
					email: 'test@email.com',
					code: '123'
				})
			).toThrow('Invalid or expired verification code');
		});
	});

	describe('validateLoginInput', () => {
		test('valid login input passes', () => {
			const result = authValidation.validateLoginInput({
				email: 'Test@Email.com',
				password: 'password123'
			});

			expect(result.email).toBe('test@email.com');
			expect(result.password).toBe('password123');
		});

		test('rejects invalid email format', () => {
			expect(() =>
				authValidation.validateLoginInput({
				email: 'invalid-email',
				password: 'password123'
				})
			).toThrow('Invalid email format');
		});
	});

	describe('validateChangePasswordInput', () => {
		test('valid change password input passes', () => {
			const result = authValidation.validateChangePasswordInput({
				currentPassword: 'oldpass',
				newPassword: 'newpassword123',
				confirmPassword: 'newpassword123'
			});

			expect(result.newPassword).toBe('newpassword123');
		});

		test('throws if passwords do not match', () => {
			expect(() =>
				authValidation.validateChangePasswordInput({
				currentPassword: 'oldpass',
				newPassword: 'newpassword123',
				confirmPassword: 'different'
				})
			).toThrow('Passwords do not match');
		});

		test('throws if new password equals current password', () => {
			expect(() =>
				authValidation.validateChangePasswordInput({
				currentPassword: 'samepassword',
				newPassword: 'samepassword',
				confirmPassword: 'samepassword'
				})
			).toThrow('must be different from the current password');
		});
	});

	describe('validateStartPasswordResetInput', () => {
		test('valid email passes', () => {
			const result = authValidation.validateStartPasswordResetInput({
				email: 'TEST@Email.com'
			});

			expect(result.email).toBe('test@email.com');
		});
	});

	describe('validateCompletePasswordResetInput', () => {
		test('valid input passes', () => {
			const result = authValidation.validateCompletePasswordResetInput({
				resetToken: 'abc123',
				newPassword: 'password123',
				confirmPassword: 'password123'
			});

			expect(result.resetToken).toBe('abc123');
			expect(result.newPassword).toBe('password123');
		});

		test('throws if passwords do not match', () => {
			expect(() =>
				authValidation.validateCompletePasswordResetInput({
				resetToken: 'abc123',
				newPassword: 'password123',
				confirmPassword: 'different'
				})
			).toThrow('Passwords do not match');
		});
	});
});