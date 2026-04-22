const settingsValidation = require('../../../../modules/settings/settings.validation');

describe('settings.validation', () => {
	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				settingsValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('allows updating activeSemesterId only', () => {
			const result = settingsValidation.validateUpdateInput({
				activeSemesterId: '1'
			});

			expect(result.activeSemesterId).toBe(1);
		});

		test('rejects invalid activeSemesterId', () => {
			expect(() =>
				settingsValidation.validateUpdateInput({
					activeSemesterId: 0
				})
			).toThrow('must be at least 1');
		});

		test('validates theme enum', () => {
			const result = settingsValidation.validateUpdateInput({
				theme: 'dark'
			});

			expect(result.theme).toBe('dark');
		});

		test('rejects invalid theme', () => {
			expect(() =>
				settingsValidation.validateUpdateInput({
					theme: 'blue'
				})
			).toThrow('must be one of');
		});

		test('updates forename and surname correctly', () => {
			const result = settingsValidation.validateUpdateInput({
				forename: ' John ',
				surname: ' Doe '
			});

			expect(result.forename).toBe('John');
			expect(result.surname).toBe('Doe');
		});

		test('allows mixed update fields', () => {
			const result = settingsValidation.validateUpdateInput({
				activeSemesterId: '2',
				theme: 'system',
				forename: 'Jane'
			});

			expect(result.activeSemesterId).toBe(2);
			expect(result.theme).toBe('system');
			expect(result.forename).toBe('Jane');
		});

	});
});