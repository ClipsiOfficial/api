import { createRoute } from "@hono/zod-openapi";
import { selectExampleUsersSchema } from "@/db/schema";

export const example = createRoute({
  method: "get",
  path: "/example",
  description: "Root endpoint",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: selectExampleUsersSchema.array(),
        },
      },
    },
  },
});

export type ExampleRoute = typeof example;

// Another example route:
// export const anotherExample = createRoute({
//   method: "post",
//   path: "/example2",
//   description: "Another example endpoint",
//   request: {
//     body: {
//       content: {
//         "application/json": {
//           schema: z.object({
//             name: z.string(),
//           }),
//         },
//       },
//     },
//   },
//   responses: {
//     200: {
//       description: "Successful response",
//       content: {
//         "application/json": {
//           schema: z.object({
//             greeting: z.string(),
//           }),

//         },
//       },
//     },
//   },
// });

// export type AnotherExampleRoute = typeof anotherExample;
