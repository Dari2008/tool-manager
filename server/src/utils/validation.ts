import { UUID_REGEX } from "../config/index.js";

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function assertValidUuid(value: string): void {
  if (!isValidUuid(value)) {
    throw new Error(`Invalid UUID format: ${value}`);
  }
}
