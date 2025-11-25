import { createRouter } from "@/utils/functions";
import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

export const publicUserRouter = createRouter();
publicUserRouter.openapi(routes.login, handlers.login);

export const privateUserRouter = createRouter();
privateUserRouter.openapi(routes.updateUser, handlers.updateUser);
privateUserRouter.openapi(routes.createUser, handlers.createUser);
