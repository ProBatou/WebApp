import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { createAuthRepository, sessionCookieName } from "./auth-repository.js";

const authRepository = createAuthRepository(db, () => randomBytes(24).toString("hex"));

export const {
  hasUsers,
  createUser,
  createInitialUser,
  findUserByUsername,
  findUserByOidcIdentity,
  listUsers,
  createSession,
  clearSession,
  getSessionUser,
  purgeExpiredSessions,
  createOidcLoginRequest,
  consumeOidcLoginRequest,
  purgeExpiredOidcLoginRequests,
  syncOidcUser,
  requireSession,
  requireAdmin,
  updateUserRole,
  deleteUser,
  updateUsername,
  updatePassword,
  applyPasswordUpdate,
  deleteSelf,
  createInvitation,
  getInvitation,
  consumeInvitation,
} = authRepository;

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

export { sessionCookieName };
