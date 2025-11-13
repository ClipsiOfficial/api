import type { ExampleRoute } from "./example.routes";
// import type { AnotherExampleRoute } from "./example.routes";
import type { AppRouteHandler } from "@/utils/types";
import { getDB } from "@/db";
import { publishToQueue } from "@/services/rabbitmq";

export const example: AppRouteHandler<ExampleRoute> = async (c) => {
  const users = await getDB(c.env).query.exampleUsers.findMany();

  await publishToQueue(c.env, "searcher", {
    message: "Example notification",
  });

  return c.json(users);
};

// Another example handler:
// export const anotherExample: AppRouteHandler<AnotherExampleRoute> = async (c) => {
//   const { name } = await c.req.parseBody();
//   return c.json({ greeting: `Hello, ${name}!` });
// };
