import { createRouter } from "@/utils/functions";
import * as handlers from "./keywords.handlers";
import * as routes from "./keywords.routes";

export const publicKeywordRouter = createRouter();

export const privateKeywordRouter = createRouter();

privateKeywordRouter.openapi(routes.getKeywords, handlers.getKeywords);
privateKeywordRouter.openapi(routes.createKeyword, handlers.createKeyword);
privateKeywordRouter.openapi(routes.deleteKeyword, handlers.deleteKeyword);
