// createRouter is a Hono object to manage routes
import { createRouter } from "@/utils/functions";
import * as handlers from "./projects.handlers";
import * as routes from "./projects.routes";

// public routes controller (accessible without login)
export const publicProjectRouter = createRouter();

// private routes controller (accessible with login)
export const privateProjectRouter = createRouter();
// when someone accesses /projects, the request is checked against routes.createProject and, if it matches, handlers.createProject is executed
privateProjectRouter.openapi(routes.createProject, handlers.createProject);
privateProjectRouter.openapi(routes.deleteProject, handlers.deleteProject);
privateProjectRouter.openapi(routes.getProjects, handlers.getUserProjects);
privateProjectRouter.openapi(routes.getProject, handlers.getProject);
privateProjectRouter.openapi(routes.updateProjectInfo, handlers.updateProjectInfo);
privateProjectRouter.openapi(routes.addProjectMember, handlers.addMember);
privateProjectRouter.openapi(routes.removeProjectMember, handlers.removeMember);
privateProjectRouter.openapi(routes.getProjectMembers, handlers.getProjectMembers);
