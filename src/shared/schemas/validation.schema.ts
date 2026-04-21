import * as yup from 'yup';
/**
 * UUID validation - checks format but doesn't strictly enforce v4
 */
export const uuidSchema = yup
    .string()
    .typeError('Must be a string')
    .matches(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'Must be a valid UUID'
    );
