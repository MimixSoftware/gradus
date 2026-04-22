const moduleValidation = require('../../../../modules/modules/module.validation');
const AppError = require('../../../../utils/AppError');

describe('module.validation', () => {
	describe('validateCreateInSemesterInput', () => {

		test('valid input returns normalised object', () => {
			const result = moduleValidation.validateCreateInSemesterInput({
				name: 'Module Name',
				credits: '30',
				colour: '#ff00aa'
			});

			expect(result.name).toBe('Module Name');
			expect(result.credits).toBe(30);
			expect(result.colour).toBe('#FF00AA');
		});

		test('rejects invalid hex colour', () => {
			expect(() =>
			moduleValidation.validateCreateInSemesterInput({
				name: 'Module Name',
				credits: 20,
				colour: 'blue'
			})
			).toThrow('Colour must be a valid hex code');
		});

		test('allows missing optional credits', () => {
			const result = moduleValidation.validateCreateInSemesterInput({
				name: 'Module Name',
				colour: '#ffffff'
			});

			expect(result.credits).toBeUndefined();
		});

		test('throws if name missing', () => {
			expect(() =>
			moduleValidation.validateCreateInSemesterInput({
				credits: 10,
				colour: '#ffffff'
			})
			).toThrow(AppError);
		});

	});

	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				moduleValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('allows updating name only', () => {
			const result = moduleValidation.validateUpdateInput({
				name: 'Updated Module Name'
			});

			expect(result.name).toBe('Updated Module Name');
		});

		test('updates and normalizes colour to uppercase', () => {
			const result = moduleValidation.validateUpdateInput({
				colour: '#aabbcc'
			});

			expect(result.colour).toBe('#AABBCC');
		});

		test('rejects invalid colour format', () => {
			expect(() =>
			moduleValidation.validateUpdateInput({
				colour: 'not-a-color'
			})
			).toThrow('Colour must be a valid hex code');
		});

		test('allows multiple fields update', () => {
			const result = moduleValidation.validateUpdateInput({
				name: 'New Name',
				credits: '15',
				colour: '#123456'
			});

			expect(result.name).toBe('New Name');
			expect(result.credits).toBe(15);
			expect(result.colour).toBe('#123456'.toUpperCase());
		});

	});

});