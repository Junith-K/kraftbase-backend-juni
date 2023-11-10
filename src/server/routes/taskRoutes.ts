import express from "express";
import { authenticateToken } from "../../auth/authMiddleware";
import { addTasks, deleteTask, getAllTasks } from "../controllers/taskController";

export const taskRoutes = express.Router();

taskRoutes.get("/allTasks", authenticateToken, getAllTasks);
taskRoutes.post("/addTask", authenticateToken, addTasks);
taskRoutes.delete("/deleteTask", authenticateToken, deleteTask);