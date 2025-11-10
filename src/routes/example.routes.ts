import { createRoute, z } from "@hono/zod-openapi";

export const example = createRoute({
  method: "get",
  path: "/example",
  description: "Root endpoint",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
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
