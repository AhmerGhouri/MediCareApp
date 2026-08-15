import { describe, expect, it } from '@jest/globals';
import { validateLogin } from '../src/utils/authValidation';

describe('validateLogin', () => {
    it('accepts valid credentials', () => {
        const result = validateLogin('03001234567', 'Password123');

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('rejects an empty username', () => {
        const result = validateLogin('', 'Password123');

        expect(result.valid).toBe(false);
        expect(result.errors.username).toBe('Username is required');
    });

    it('rejects an empty password', () => {
        const result = validateLogin('03001234567', '');

        expect(result.valid).toBe(false);
        expect(result.errors.password).toBe('Password is required');
    });

    it('rejects both fields empty', () => {
        const result = validateLogin('', '');

        expect(result.valid).toBe(false);
        expect(result.errors.username).toBe('Username is required');
        expect(result.errors.password).toBe('Password is required');
    });

    it('ignores whitespace-only usernames', () => {
        const result = validateLogin('   ', 'Password123');

        expect(result.valid).toBe(false);
        expect(result.errors.username).toBe('Username is required');
    });
});