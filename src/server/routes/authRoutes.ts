// src/server/routes/authRoutes.ts

import express from "express";
import { registerUser, loginUser } from "../controllers/authController";

export const authRoutes = express.Router();

authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);
