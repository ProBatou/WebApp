import type { FastifyReply } from "fastify";
import { isDemoMode } from "./demo.js";

export function blockDemoWrites(reply: FastifyReply): boolean {
  if (!isDemoMode) {
    return false;
  }

  reply.code(403).send({ message: "errors.demoMode" });
  return true;
}
