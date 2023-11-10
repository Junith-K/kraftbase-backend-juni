// src/server/routes/projectRoutes.ts

import express from "express";
import { createProject, getProjectNames, getProjectIDAllTasks, projectAddTask, projectDeleteTask } from "../controllers/projectController";
import { authenticateToken } from "../../auth/authMiddleware";

export const projectRoutes = express.Router();

projectRoutes.post("/createProject", authenticateToken, createProject);
projectRoutes.get("/:projectId/allTasks", authenticateToken, getProjectIDAllTasks);
projectRoutes.post("/:projectId/addTask", authenticateToken, projectAddTask);
projectRoutes.delete("/:projectId/deleteTask", authenticateToken, projectDeleteTask);
projectRoutes.get("/names", authenticateToken, getProjectNames);