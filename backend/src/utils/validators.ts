import { ApiError } from './errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Largest value that fits NUMERIC(15, 2)
const MAX_AMOUNT = 9_999_999_999_999.99;

export const validationError = (message: string) =>
  new ApiError(400, 'Validation Error', message);

export const requireUuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw validationError(`${field} is required and must be a valid UUID.`);
  }
  return value.trim().toLowerCase();
};

export const requireText = (value: unknown, field: string, maxLength = 255): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`${field} is required and must not be empty.`);
  }
  if (value.trim().length > maxLength) {
    throw validationError(`${field} must be at most ${maxLength} characters.`);
  }
  return value.trim();
};

export const optionalText = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw validationError(`${field} must be a string.`);
  }
  return value.trim() || null;
};

export const requireAmount = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > MAX_AMOUNT) {
    throw validationError('amount must be a number greater than 0.');
  }
  const fixed = value.toFixed(2);
  if (Number(fixed) <= 0) {
    throw validationError('amount must be a number greater than 0.');
  }
  return fixed;
};
