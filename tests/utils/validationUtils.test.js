const v = require('../../utils/validationUtils');
const AppError = require('../../utils/AppError');

describe('validationUtils', () => {
	describe('validateRequiredString', () => {
		test('returns trimmed string', () => {
			const result = v.validateRequiredString('  hello  ', 'Name');
			expect(result).toBe('hello');
		});

		test('returns lowercase string', () => {
			const result = v.validateRequiredString('HeLLo', 'Name', { toLowerCase: true });
			expect(result).toBe('hello');
		});

		test('throws if missing', () => {
			expect(() =>
				v.validateRequiredString(undefined, 'Name')
			).toThrow(AppError);
		});

		test('throws if empty after trim', () => {
			expect(() =>
				v.validateRequiredString('   ', 'Name')
			).toThrow('must not be empty');
		});

		test('respects min length', () => {
			expect(() =>
				v.validateRequiredString('ab', 'Name', { min: 3 })
			).toThrow('must be at least');
		});

		test('respects max length', () => {
			expect(() =>
				v.validateRequiredString('abcdef', 'Name', { max: 3 })
			).toThrow('must not exceed');
		});

		test('applies pattern validation', () => {
			expect(() =>
				v.validateRequiredString('123', 'Name', {
					pattern: /^[a-z]+$/,
					patternMessage: 'Only letters allowed'
				})
			).toThrow('Only letters allowed');
		});
	});

	describe('validateOptionalString', () => {
		test('returns undefined if undefined', () => {
			expect(v.validateOptionalString(undefined, 'Name')).toBeUndefined();
		});

		test('returns null if empty string', () => {
			expect(v.validateOptionalString('', 'Name')).toBeNull();
		});

		test('valid value passes through', () => {
			const result = v.validateOptionalString('  hello ', 'Name');
			expect(result).toBe('hello');
		});
	});

	describe('validateRequiredInt', () => {
		test('parses valid int', () => {
			expect(v.validateRequiredInt('10', 'Age')).toBe(10);
		});

		test('throws if not integer', () => {
			expect(() =>
				v.validateRequiredInt('10.5', 'Age')
			).toThrow('must be an integer');
		});

		test('enforces min range', () => {
			expect(() =>
				v.validateRequiredInt('5', 'Age', { min: 10 })
			).toThrow('must be at least');
		});

		test('enforces max range', () => {
			expect(() =>
				v.validateRequiredInt('15', 'Age', { max: 10 })
			).toThrow('must be at most');
		});

		test('enforces range', () => {
			expect(() =>
				v.validateRequiredInt('10', 'Age', { min: 1, max: 5 })
			).toThrow('must be between');
		});

		test('enforces step', () => {
			expect(() =>
				v.validateRequiredInt('7', 'Age', { step: 5 })
			).toThrow('increments of');
		});
	});

	describe('validateOptionalInt', () => {
		test('returns undefined if undefined', () => {
			expect(v.validateOptionalInt(undefined, 'Age')).toBeUndefined();
		});

		test('returns null if empty string', () => {
			expect(v.validateOptionalInt('', 'Age')).toBeNull();
		});

		test('valid value passes through', () => {
			const result = v.validateOptionalInt(5, 'Age');
			expect(result).toBe(5);
		});
	});

	describe('validateRequiredEnum', () => {
		test('accepts valid enum', () => {
			expect(
				v.validateRequiredEnum('a', 'Type', ['a', 'b'])
			).toBe('a');
		});

		test('rejects invalid enum', () => {
			expect(() =>
				v.validateRequiredEnum('c', 'Type', ['a', 'b'])
			).toThrow('must be one of');
		});
	});

	describe('validateRequiredDate', () => {
		test('accepts valid date', () => {
			expect(
				v.validateRequiredDate('2024-01-10', 'Start Date')
			).toBe('2024-01-10');
		});

		test('rejects invalid format', () => {
			expect(() =>
				v.validateRequiredDate('10-01-2024', 'Start Date')
			).toThrow('YYYY-MM-DD format');
		});

		test('rejects invalid date', () => {
			expect(() =>
				v.validateRequiredDate('2024-02-30', 'Start Date')
			).toThrow('must be a valid date');
		});
	});

	describe('validateRequiredUtcDatetime', () => {
		test('converts valid UTC datetime', () => {
			const result = v.validateRequiredUtcDatetime(
				'2024-01-10T10:00:00Z',
				'Date'
			);

			expect(result).toBe('2024-01-10 10:00:00');
		});

		test('rejects non-Z time', () => {
			expect(() =>
				v.validateRequiredUtcDatetime('2024-01-10T10:00:00', 'Date')
			).toThrow("must be in UTC");
		});
	});

	describe('validateOptionalUtcDatetime', () => {
		test('returns undefined if undefined', () => {
			expect(v.validateOptionalUtcDatetime(undefined, 'Date')).toBeUndefined();
		});

		test('returns null if empty string', () => {
			expect(v.validateOptionalUtcDatetime('', 'Date')).toBeNull();
		});

		test('valid value passes through', () => {
			const result = v.validateOptionalUtcDatetime('2024-01-10T10:00:00Z', 'Age');
			expect(result).toBe('2024-01-10 10:00:00');
		});
	});

	describe('validateRequiredTime', () => {
		test('accepts valid time', () => {
			expect(
				v.validateRequiredTime('14:30', 'Time')
			).toBe('14:30:00');
		});

		test('rejects invalid format', () => {
			expect(() =>
				v.validateRequiredTime('1430', 'Time')
			).toThrow('HH:mm format');
		});

		test('enforces step minutes', () => {
			expect(() =>
				v.validateRequiredTime('14:35', 'Time', { stepMinutes: 15 })
			).toThrow('15-minute increments');
		});
	});
});