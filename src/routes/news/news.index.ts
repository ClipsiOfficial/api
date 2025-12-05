import { createRouter } from "@/utils/functions";
import * as handlers from "./news.handlers";
import * as routes from "./news.routes";

export const privateNewsRouter = createRouter();

privateNewsRouter.openapi(routes.createNews, handlers.createNews);
privateNewsRouter.openapi(routes.saveNews, handlers.saveNews);
privateNewsRouter.openapi(routes.updateSavedNews, handlers.updateSavedNews);
privateNewsRouter.openapi(routes.getNews, handlers.getNews);
privateNewsRouter.openapi(routes.getSavedNews, handlers.getSavedNews);
privateNewsRouter.openapi(routes.deleteSavedNews, handlers.deleteSavedNews);
