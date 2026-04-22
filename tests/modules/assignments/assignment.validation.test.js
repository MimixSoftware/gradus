const assignmentValidation = require('../../../modules/assignments/assignment.validation');
const AppError = require('../../../utils/AppError');

describe('assignment.validation', () => {
	describe('validateCreateInModuleInput', () => {

		test('valid input returns normalised object', () => {
			const result = assignmentValidation.validateCreateInModuleInput({
				name: 'Test Assignment',
				description: 'Some description',
				weight: '50',
				confidence: '3',
				deadline: '2024-01-10T10:00:00Z'
			});

			expect(result.name).toBe('Test Assignment');
			expect(result.description).toBe('Some description');
			expect(result.weight).toBe(50);
			expect(result.confidence).toBe(3);
			expect(typeof result.deadline).toBe('string');
		});

		test('throws if name is missing', () => {
			expect(() =>
				assignmentValidation.validateCreateInModuleInput({})
			).toThrow(AppError);
		});

		test('sets optional fields to null when undefined', () => {
			const result = assignmentValidation.validateCreateInModuleInput({
				name: 'Test'
			});

			expect(result.description).toBeNull();
			expect(result.weight).toBeNull();
			expect(result.confidence).toBeNull();
			expect(result.deadline).toBeNull();
		});

	});

	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				assignmentValidation.validateUpdateInput({})
			).toThrow('At least one field is required.');
		});

		test('allows updating name only', () => {
			const result = assignmentValidation.validateUpdateInput({
				name: 'Updated Name'
			});

			expect(result.name).toBe('Updated Name');
		});

		test('validates status enum', () => {
			const result = assignmentValidation.validateUpdateInput({
				status: 'active'
			});

			expect(result.status).toBe('active');
		});

		test('rejects invalid status', () => {
			expect(() =>
				assignmentValidation.validateUpdateInput({
					status: 'invalid-status'
				})
			).toThrow('must be one of');
		});

		test('allows multiple valid fields', () => {
			const result = assignmentValidation.validateUpdateInput({
				name: 'Test',
				weight: '20',
				confidence: '4'
			});

			expect(result.name).toBe('Test');
			expect(result.weight).toBe(20);
			expect(result.confidence).toBe(4);
		});

		test('validates optional fields correctly', () => {
			const result = assignmentValidation.validateUpdateInput({
				description: 'Updated description'
			});

			expect(result.description).toBe('Updated description');
		});

	});
});