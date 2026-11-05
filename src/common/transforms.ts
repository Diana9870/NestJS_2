import { TransformFnParams } from 'class-transformer';

/** Trims string values; any other type is passed on so validators can reject it. */
export const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Query-string values are strings. A string of digits (optionally negative) is
 * turned into a number; anything else ("abc", "1.5", "1e3", "", arrays) is
 * passed on unchanged so that `@IsInt()` rejects it with a 400.
 */
export const toInteger = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return value;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
};
