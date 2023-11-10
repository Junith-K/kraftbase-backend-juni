// src/server/controllers/authController.ts

import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import client from "../../database/dbConnection";

const dbName = "test";
const collectionName = "kraftbase";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const { username, email, password } = req.body;

    // Check if the email already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: "Email is already registered. Please use a different email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      tasks: {},
      projects: []
    };

    await collection.insertOne(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { username, email },
      process.env.SECRET_KEY as string
    );

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const { email, password } = req.body;

    // Check if user exists
    const user = await collection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token for authentication
    console.log(process.env.SECRET_KEY);

    const token = jwt.sign({ email }, process.env.SECRET_KEY as string);

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
