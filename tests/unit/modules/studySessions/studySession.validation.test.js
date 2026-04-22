const studySessionValidation = require('../../../../modules/studySessions/studySession.validation');

describe('studySession.validation', () => {
	describe('validateCreateInSemesterInput', () => {

		test('valid input returns normalised object', () => {
			const result = studySessionValidation.validateCreateInSemesterInput({
				dayOfWeek: '2',
				startTime: '10:00',
				durationMinutes: '60'
			});

			expect(result.dayOfWeek).toBe(2);
			expect(result.startTime).toBe('10:00:00');
			expect(result.durationMinutes).toBe(60);
		});

		test('rejects invalid dayOfWeek', () => {
			expect(() =>
				studySessionValidation.validateCreateInSemesterInput({
					dayOfWeek: 7,
					startTime: '10:00',
					durationMinutes: 60
				})
			).toThrow('must be between 0 and 6');
		});

		test('rejects invalid time format', () => {
			expect(() =>
				studySessionValidation.validateCreateInSemesterInput({
					dayOfWeek: 1,
					startTime: 'invalid-time',
					durationMinutes: 60
				})
			).toThrow('HH:mm format');
		});

		test('rejects duration exceeding midnight boundary', () => {
			expect(() =>
				studySessionValidation.validateCreateInSemesterInput({
					dayOfWeek: 1,
					startTime: '23:30',
					durationMinutes: 60
				})
			).toThrow('cannot spill into the next day');
		});

	});

	describe('validateUpdateInput', () => {

		test('throws if no fields provided', () => {
			expect(() =>
				studySessionValidation.validateUpdateInput({})
			).toThrow('At least one field is required');
		});

		test('allows updating dayOfWeek only', () => {
			const result = studySessionValidation.validateUpdateInput({
				dayOfWeek: 3
			});

			expect(result.dayOfWeek).toBe(3);
		});

		test('allows updating startTime only', () => {
			const result = studySessionValidation.validateUpdateInput({
				startTime: '10:00'
			});

			expect(result.startTime).toBe('10:00:00');
		});

		test('allows updating duration only', () => {
			const result = studySessionValidation.validateUpdateInput({
				durationMinutes: 45
			});

			expect(result.durationMinutes).toBe(45);
		});

		test('rejects invalid dayOfWeek', () => {
			expect(() =>
				studySessionValidation.validateUpdateInput({
					dayOfWeek: -1
				})
			).toThrow('must be between 0 and 6');
		});

		test('rejects duration step violation', () => {
			expect(() =>
				studySessionValidation.validateUpdateInput({
					durationMinutes: 22
				})
			).toThrow('in increments of 15');
		});

		test('rejects midnight overflow when both time + duration provided', () => {
			expect(() =>
				studySessionValidation.validateUpdateInput({
					startTime: '23:30',
					durationMinutes: 60
				})
			).toThrow('cannot spill into the next day');
		});

	});
});