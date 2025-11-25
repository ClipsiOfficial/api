import type { CreateUserRoute, LoginRoute, UpdateUserRoute } from "./users.routes";
import type { AppRouteHandler } from "@/utils/types";
import { compare, hash } from "bcryptjs";

import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";

import { getDB } from "@/db";
import { users } from "@/db/schema";

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDB(c.env);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Dummy hash used when user is not found to equalize bcrypt cost
  const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5V8b6j6Zy3KqFh6u1v0h5o8b5QeW.";

  const hashToCheck = user ? user.password : DUMMY_HASH;
  const validPassword = await compare(password, hashToCheck);

  if (!user || !validPassword) {
    return c.json({ message: "Invalid credentials" }, 401);
  }

  const token = await sign({ sub: user.id, role: user.role }, c.env.JWT_SECRET);

  const { password: _, ...userWithoutPassword } = user;

  return c.json({
    token,
    user: userWithoutPassword,
  });
};

export const createUser: AppRouteHandler<CreateUserRoute> = async (c) => {
  const payload = c.get("jwtPayload");

  if (!payload || payload.role !== "admin") {
    return c.json({ message: "Forbidden - Admin access required" }, 403);
  }

  const body = c.req.valid("json");
  const db = getDB(c.env);

  const hashedPassword = await hash(body.password, 10);

  const [newUser] = await db.insert(users).values({
    ...body,
    password: hashedPassword,
  }).returning();

  const { password: _, ...userWithoutPassword } = newUser;
  return c.json(userWithoutPassword, 201);
};

export const updateUser: AppRouteHandler<UpdateUserRoute> = async (c) => {
  const payload = c.get("jwtPayload");

  if (!payload) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const userId = Number(payload.sub);
  const body = c.req.valid("json");
  const db = getDB(c.env);

  const updateData: Partial<typeof users.$inferInsert> = { ...body };

  if (body.password) {
    updateData.password = await hash(body.password, 10);
  }

  const [updatedUser] = await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    return c.json({ message: "User not found" }, 404);
  }

  const { password: _, ...userWithoutPassword } = updatedUser;
  return c.json(userWithoutPassword);
};
