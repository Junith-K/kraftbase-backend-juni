// src/server/app.ts

import express from "express";
import cors from "cors";
import dotenv from 'dotenv'
dotenv.config()
import { authRoutes } from "./routes/authRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { dbConnection } from "../database/dbConnection";
import { taskRoutes } from "./routes/taskRoutes";


const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

dbConnection();

app.use("/api", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
