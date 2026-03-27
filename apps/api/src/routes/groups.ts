import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAdmin, requireSession } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { isDemoMode } from "../lib/demo.js";
import { createGroupRepository } from "../lib/group-repository.js";

const groupRepository = createGroupRepository(db);

const groupSchema = z.object({
  name: z.string().trim().min(2).max(40),
});

function blockDemoWrites(reply: FastifyReply) {
  if (!isDemoMode) {
    return false;
  }

  reply.code(403).send({ message: "errors.demoMode" });
  return true;
}

export async function registerGroupRoutes(server: FastifyInstance) {
  const writeRouteConfig = {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  } as const;

  server.get("/api/groups", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    return {
      items: groupRepository.listGroups(),
    };
  });

  server.post("/api/groups", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidData" });
    }

    const group = groupRepository.createGroup(parsed.data.name);

    return reply.code(201).send({ item: group, items: groupRepository.listGroups() });
  });

  server.put("/api/groups/:id", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidData" });
    }

    const group = groupRepository.updateGroup(id, parsed.data.name);
    if (!group) {
      return reply.code(404).send({ message: "errors.notFound" });
    }

    return { item: group, items: groupRepository.listGroups() };
  });

  server.delete("/api/groups/:id", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    if (!groupRepository.hasGroup(id)) {
      return reply.code(404).send({ message: "errors.notFound" });
    }

    groupRepository.deleteGroup(id);
    return { items: groupRepository.listGroups() };
  });
}
