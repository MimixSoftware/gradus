const semesterValidation = require('../../../modules/semesters/semester.validation');
const AppError = require('../../../utils/AppError');

describe('semester.validation', () => {
	describe('validateCreateInput', () => {

		test('valid input returns normalised object', () => {
			const result = semesterValidation.validateCreateInput({
				name: 'Semester 1',
				startDate: '2024-01-01',
				endDate: '2024-06-01'
			});

			expect(result.name).toBe('Semester 1');
			expect(result.startDate).toBe('2024-01-01');
			expect(result.endDate).toBe('2024-06-01');
		});

		test('throws if startDate is after endDate', () => {
			expect(() =>
				semesterValidation.validateCreateInput({
					name: 'Semester 1',
					startDate: '2024-06-01',
					endDate: '2024-01-01'
				})
			).toThrow('Start date cannot be after end date');
		});

		test('throws if name missing', () => {
			expect(() =>
				semesterValidation.validateCreateInput({
				startDate: '2024-01-01',
				endDate: '2024-06-01'
				})
			).toThrow(AppError);
		});

	});

	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				semesterValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('allows updating name only', () => {
			const result = semesterValidation.validateUpdateInput({
				name: 'Updated Semester'
			});

			expect(result.name).toBe('Updated Semester');
		});

		test('requires both startDate and endDate together', () => {
			expect(() =>
				semesterValidation.validateUpdateInput({
					startDate: '2024-01-01'
				})
			).toThrow('Both start date and end date must be provided');
		});

		test('allows valid date update pair', () => {
			const result = semesterValidation.validateUpdateInput({
				startDate: '2024-01-01',
				endDate: '2024-06-01'
			});

			expect(result.startDate).toBe('2024-01-01');
			expect(result.endDate).toBe('2024-06-01');
		});

	});
});