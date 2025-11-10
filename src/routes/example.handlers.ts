import type { ExampleRoute } from "./example.routes";
// import type { AnotherExampleRoute } from "./example.routes";
import type { AppRouteHandler } from "@/utils/types";

export const example: AppRouteHandler<ExampleRoute> = async (c) => {
  return c.json({ message: `Hello Hono! We are on ${c.env.ENV} enviroment` });
};

// Another example handler:
// export const anotherExample: AppRouteHandler<AnotherExampleRoute> = async (c) => {
//   const { name } = await c.req.parseBody();
//   return c.json({ greeting: `Hello, ${name}!` });
// };
