import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { createAuthRepository, sessionCookieName } from "./auth-repository.js";

const authRepository = createAuthRepository(db, () => randomBytes(24).toString("hex"));

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hasUsers() {
  return authRepository.hasUsers();
}

export function createUser(username: string, passwordHash: string) {
  return authRepository.createUser(username, passwordHash);
}

export function createInitialUser(username: string, passwordHash: string) {
  return authRepository.createInitialUser(username, passwordHash);
}

export function findUserByUsername(username: string) {
  return authRepository.findUserByUsername(username);
}

export function createSession(...args: Parameters<typeof authRepository.createSession>) {
  return authRepository.createSession(...args);
}

export function clearSession(...args: Parameters<typeof authRepository.clearSession>) {
  return authRepository.clearSession(...args);
}

export function getSessionUser(...args: Parameters<typeof authRepository.getSessionUser>) {
  return authRepository.getSessionUser(...args);
}

export function requireSession(...args: Parameters<typeof authRepository.requireSession>) {
  return authRepository.requireSession(...args);
}

export { sessionCookieName };
