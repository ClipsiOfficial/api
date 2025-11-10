import { createRouter } from "..";
import * as handlers from "./example.handlers";
import * as routes from "./example.routes";

const router = createRouter();

router.openapi(routes.example, handlers.example);
// router.openapi(routes.anotherExample, handlers.anotherExample);

export default router;
