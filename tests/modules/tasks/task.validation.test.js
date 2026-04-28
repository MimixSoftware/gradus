const taskValidation = require('../../../modules/tasks/task.validation');
const AppError = require('../../../utils/AppError');

describe('task.validation', () => {
	describe('validateCreateInAssignmentInput', () => {
		test('valid input returns normalised object', () => {
			const result = taskValidation.validateCreateInAssignmentInput({
				name: 'Task 1',
				description: 'Some description',
				deadline: '2024-01-01T10:00:00Z',
				etcMinutes: '60'
			});

			expect(result.name).toBe('Task 1');
			expect(result.description).toBe('Some description');
			expect(result.deadline).toBe('2024-01-01 10:00:00');
			expect(result.etcMinutes).toBe(60);
		});

		test('allows null optional fields', () => {
			const result = taskValidation.validateCreateInAssignmentInput({
				name: 'Task 1'
			});

			expect(result.description).toBeNull();
			expect(result.deadline).toBeNull();
			expect(result.etcMinutes).toBeNull();
		});

		test('rejects invalid ETC step value', () => {
			expect(() =>
			taskValidation.validateCreateInAssignmentInput({
				name: 'Task 1',
				etcMinutes: 22
			})
			).toThrow('in increments of 15');
		});
	});

	describe('validateUpdateInput', () => {
		test('throws if no fields provided', () => {
			expect(() =>
				taskValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('updates name only', () => {
			const result = taskValidation.validateUpdateInput({
				name: 'Updated Task'
			});

			expect(result.name).toBe('Updated Task');
		});

		test('validates status enum', () => {
			const result = taskValidation.validateUpdateInput({
				status: 'doing'
			});

			expect(result.status).toBe('doing');
		});

		test('rejects invalid status', () => {
			expect(() =>
				taskValidation.validateUpdateInput({
					status: 'invalid'
				})
			).toThrow('must be one of');
		});

		test('updates ETC and ATC correctly', () => {
			const result = taskValidation.validateUpdateInput({
				etcMinutes: '60',
				atcMinutes: '45'
			});

			expect(result.etcMinutes).toBe(60);
			expect(result.atcMinutes).toBe(45);
		});

		test('rejects invalid ATC minutes', () => {
			expect(() =>
			taskValidation.validateUpdateInput({
				atcMinutes: 0
			})
			).toThrow('must be between 1 and 1440');
		});

		test('allows full update payload', () => {
			const result = taskValidation.validateUpdateInput({
				name: 'Task',
				description: 'Desc',
				status: 'todo',
				deadline: '2024-01-01T10:00:00Z',
				etcMinutes: '30',
				atcMinutes: '20'
			});

			expect(result.name).toBe('Task');
			expect(result.status).toBe('todo');
		});
	});

	describe('validateEstimateInput', () => {
		test('valid estimate input passes', () => {
			const result = taskValidation.validateEstimateInput({
				assignmentId: '1',
				taskName: 'Essay',
				taskDescription: 'Write essay'
			});

			expect(result.assignmentId).toBe(1);
			expect(result.taskName).toBe('Essay');
			expect(result.taskDescription).toBe('Write essay');
		});

		test('allows null task description', () => {
			const result = taskValidation.validateEstimateInput({
				assignmentId: 1,
				taskName: 'Essay'
			});

			expect(result.taskDescription).toBeNull();
		});

		test('rejects missing assignmentId', () => {
			expect(() =>
				taskValidation.validateEstimateInput({
					taskName: 'Essay'
				})
			).toThrow(AppError);
		});
	});
});