import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { createAuthRepository, sessionCookieName } from "./auth-repository.js";

const authRepository = createAuthRepository(db, () => randomBytes(24).toString("hex"));

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

export function hasUsers() {
  return authRepository.hasUsers();
}

export function createUser(...args: Parameters<typeof authRepository.createUser>) {
  return authRepository.createUser(...args);
}

export function createInitialUser(username: string, passwordHash: string) {
  return authRepository.createInitialUser(username, passwordHash);
}

export function findUserByUsername(username: string) {
  return authRepository.findUserByUsername(username);
}

export function findUserByOidcIdentity(...args: Parameters<typeof authRepository.findUserByOidcIdentity>) {
  return authRepository.findUserByOidcIdentity(...args);
}

export function listUsers(...args: Parameters<typeof authRepository.listUsers>) {
  return authRepository.listUsers(...args);
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

export function purgeExpiredSessions() {
  return authRepository.purgeExpiredSessions();
}

export function createOidcLoginRequest(...args: Parameters<typeof authRepository.createOidcLoginRequest>) {
  return authRepository.createOidcLoginRequest(...args);
}

export function consumeOidcLoginRequest(...args: Parameters<typeof authRepository.consumeOidcLoginRequest>) {
  return authRepository.consumeOidcLoginRequest(...args);
}

export function purgeExpiredOidcLoginRequests() {
  return authRepository.purgeExpiredOidcLoginRequests();
}

export function syncOidcUser(...args: Parameters<typeof authRepository.syncOidcUser>) {
  return authRepository.syncOidcUser(...args);
}

export function requireSession(...args: Parameters<typeof authRepository.requireSession>) {
  return authRepository.requireSession(...args);
}

export function requireAdmin(...args: Parameters<typeof authRepository.requireAdmin>) {
  return authRepository.requireAdmin(...args);
}

export function updateUserRole(...args: Parameters<typeof authRepository.updateUserRole>) {
  return authRepository.updateUserRole(...args);
}

export function deleteUser(...args: Parameters<typeof authRepository.deleteUser>) {
  return authRepository.deleteUser(...args);
}

export function updateUsername(...args: Parameters<typeof authRepository.updateUsername>) {
  return authRepository.updateUsername(...args);
}

export function updatePassword(...args: Parameters<typeof authRepository.updatePassword>) {
  return authRepository.updatePassword(...args);
}

export function applyPasswordUpdate(...args: Parameters<typeof authRepository.applyPasswordUpdate>) {
  return authRepository.applyPasswordUpdate(...args);
}

export function deleteSelf(...args: Parameters<typeof authRepository.deleteSelf>) {
  return authRepository.deleteSelf(...args);
}

export function createInvitation(...args: Parameters<typeof authRepository.createInvitation>) {
  return authRepository.createInvitation(...args);
}

export function getInvitation(...args: Parameters<typeof authRepository.getInvitation>) {
  return authRepository.getInvitation(...args);
}

export function consumeInvitation(...args: Parameters<typeof authRepository.consumeInvitation>) {
  return authRepository.consumeInvitation(...args);
}

export { sessionCookieName };
