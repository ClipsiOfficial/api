import type { ExampleRoute } from "./example.routes";
// import type { AnotherExampleRoute } from "./example.routes";
import type { AppRouteHandler } from "@/utils/types";
import { getDB } from "@/db";

export const example: AppRouteHandler<ExampleRoute> = async (c) => {
  const users = await getDB(c.env).query.exampleUsers.findMany();
  return c.json(users);
};

// Another example handler:
// export const anotherExample: AppRouteHandler<AnotherExampleRoute> = async (c) => {
//   const { name } = await c.req.parseBody();
//   return c.json({ greeting: `Hello, ${name}!` });
// };
