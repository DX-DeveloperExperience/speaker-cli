const { isValidateName } = require('../utils/validators');

describe('Validators', () => {
	describe('isValidateName', () => {
		test('should return true on valid name', () => {
			const valid1 = 'test.valid-name';
			const valid2 = 'test1312valid-name13123';
			const valid3 = 'test.valid-name-1231.33';
			expect(isValidateName(valid1)).toBeTruthy();
			expect(isValidateName(valid2)).toBeTruthy();
			expect(isValidateName(valid3)).toBeTruthy();
		});

		test('should return false on invalid name', () => {
			const invalid1 = 'invalid-name/';
			const invalid2 = 'test$withspecialcharacters';
			const invalid3 = 'testwithspecialcharacters2()';
			const invalid4 = 'test with space';
			expect(isValidateName(invalid1)).toBeFalsy();
			expect(isValidateName(invalid2)).toBeFalsy();
			expect(isValidateName(invalid3)).toBeFalsy();
			expect(isValidateName(invalid4)).toBeFalsy();
		});
	});
});
