// createRouter is a Hono object to manage routes
import { createRouter } from "@/utils/functions";
import * as handlers from "./projects.handlers";
import * as routes from "./projects.routes";

// controlador de rutes publiques (accessible without login)
export const publicProjectRouter = createRouter();

// controlador de rutes privades (accessible with login)
export const privateProjectRouter = createRouter();
// cuando alguien accede a /projects, se mira si la peticion coincide con routes.createProject si es asi se ejecuta handlers.createProject
privateProjectRouter.openapi(routes.createProject, handlers.createProject);
privateProjectRouter.openapi(routes.deleteProject, handlers.deleteProject);
privateProjectRouter.openapi(routes.getProjects, handlers.getUserProjects);
privateProjectRouter.openapi(routes.getProject, handlers.getProject);
privateProjectRouter.openapi(routes.updateProjectInfo, handlers.updateProjectInfo);
privateProjectRouter.openapi(routes.addProjectMember, handlers.addMember);
privateProjectRouter.openapi(routes.removeProjectMember, handlers.removeMember);

