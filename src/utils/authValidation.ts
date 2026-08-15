export type LoginValidationResult = {
    valid: boolean;
    errors: {
        username?: string;
        password?: string;
    };
};

export const validateLogin = (
    username: string,
    password: string,
): LoginValidationResult => {
    const errors: LoginValidationResult['errors'] = {};

    if (!username.trim()) {
        errors.username = 'Username is required';
    }

    if (!password) {
        errors.password = 'Password is required';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
};