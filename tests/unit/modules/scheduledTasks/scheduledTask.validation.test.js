const scheduledTasksValidation = require('../../../../modules/scheduledTasks/scheduledTask.validation');
const AppError = require('../../../../utils/AppError');

describe('scheduledTask.validation', () => {
	describe('validateCreateInStudySessionInput', () => {

		test('valid input returns normalised object', () => {
			const result = scheduledTasksValidation.validateCreateInStudySessionInput({
				taskId: '1',
				sessionDate: '2024-01-10',
				position: '2',
				durationMinutes: '60'
			});

			expect(result.taskId).toBe(1);
			expect(result.sessionDate).toBe('2024-01-10');
			expect(result.position).toBe(2);
			expect(result.durationMinutes).toBe(60);
		});

		test('rejects invalid duration step (not 15-min increments)', () => {
			expect(() =>
				scheduledTasksValidation.validateCreateInStudySessionInput({
					taskId: 1,
					sessionDate: '2024-01-10',
					durationMinutes: 22
				})
			).toThrow('in increments of 15');
		});

		test('rejects missing taskId', () => {
			expect(() =>
				scheduledTasksValidation.validateCreateInStudySessionInput({
					sessionDate: '2024-01-10',
					durationMinutes: 30
				})
			).toThrow(AppError);
		});

	});

	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				scheduledTasksValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('allows updating position only', () => {
			const result = scheduledTasksValidation.validateUpdateInput({
				position: '3'
			});

			expect(result.position).toBe(3);
		});

		test('allows updating duration only', () => {
			const result = scheduledTasksValidation.validateUpdateInput({
				durationMinutes: '45'
			});

			expect(result.durationMinutes).toBe(45);
		});

		test('rejects invalid duration step', () => {
			expect(() =>
				scheduledTasksValidation.validateUpdateInput({
					durationMinutes: 23
				})
			).toThrow('in increments of 15');
		});

	});

	describe('validateCreateManyInput', () => {

		test('valid batch input returns normalised allocations', () => {
			const result = scheduledTasksValidation.validateCreateManyInput({
			allocations: [
				{
					taskId: '1',
					studySessionId: '2',
					sessionDate: '2024-01-10',
					position: '0',
					durationMinutes: '30'
				}
			]
			});

			expect(result.allocations).toHaveLength(1);

			expect(result.allocations[0]).toEqual({
				taskId: 1,
				studySessionId: 2,
				sessionDate: '2024-01-10',
				position: 0,
				durationMinutes: 30
			});
		});

		test('throws if allocations is not an array', () => {
			expect(() =>
				scheduledTasksValidation.validateCreateManyInput({
					allocations: 'not-array'
				})
			).toThrow('Allocations must be an array');
		});

		test('throws if allocations array is empty', () => {
			expect(() =>
				scheduledTasksValidation.validateCreateManyInput({
					allocations: []
				})
			).toThrow('At least one allocation is required');
		});

		test('throws if any allocation is invalid', () => {
			expect(() =>
				scheduledTasksValidation.validateCreateManyInput({
					allocations: [
						{
							taskId: 1,
							studySessionId: 2,
							sessionDate: 'invalid-date',
							durationMinutes: 30
						}
					]
				})
			).toThrow(AppError);
		});

	});
});