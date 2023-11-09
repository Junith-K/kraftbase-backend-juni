// src/server.ts

import express, { Request, Response } from "express";
import cors from "cors";
import { MongoClient, MongoClientOptions } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
import { AuthenticatedRequest, authenticateToken } from "./auth/authMiddleware";

const app = express();
const port = 3001;
const dbName = "test";
const collectionName = "kraftbase";

interface Task {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  tag: string;
  priority: boolean;
}

interface Project {
  id: string;
  name: string;
  tasks: Task[]; 
}

app.use(cors());
app.use(express.json());
console.log(process.env.SECRET_KEY);

const client = new MongoClient(process.env.MONGO_LINK as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true, 
} as MongoClientOptions);

client
  .connect()
  .then(() => {
    console.log("Connected to MongoDB");

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err: Error) => {
    console.error("Error connecting to MongoDB:", err);
  });

app.post("/api/register", async (req, res) => {
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
    };

    await collection.insertOne(newUser);

    // Generate JWT token
    const token = jwt.sign({ username, email }, process.env.SECRET_KEY as string);

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/login", async (req, res) => {
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
    const token = jwt.sign({ email }, process.env.SECRET_KEY as string);

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/projects/names", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Find the user based on the email in the token
    const userEmail = (req.user as { email: string }).email;
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract only the id and name properties from each project
    const projectsNames = user.projects.map(({ id, name }: { id: string; name: string }) => ({ id, name }));

    // Send the id and name of all projects in the response
    res.status(200).json({ projectsNames });
  } catch (error) {
    console.error("Error fetching project names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post(
  "/api/createProject",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, name } = req.body;

      if (!id || !name) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const database = client.db(dbName);
      const collection = database.collection(collectionName);

      // Find the user based on the email in the token
      const userEmail = (req.user as { email: string }).email;
      const user = await collection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Ensure that the 'projects' field exists in the user document
      if (!user.projects) {
        user.projects = [];
      }

      // Check if a project with the given ID already exists
      if (user.projects.some((proj: Project) => proj.id === id)) {
        return res.status(400).json({ error: "Project with the specified ID already exists" });
      }

      // Create a new project with the provided ID, name, and an empty tasks array
      const newProject: Project = {
        id,
        name,
        tasks: [],
      };

      // Add the new project to the user's projects array
      user.projects.push(newProject);

      // Update the user document in the database
      await collection.updateOne(
        { email: userEmail },
        { $set: { projects: user.projects } }
      );

      res.status(201).json({ message: "Project created successfully" });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);



// Add a new endpoint to fetch all tasks
app.get("/api/allTasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Find the user based on the email in the token
    const userEmail = (req.user as { email: string }).email;
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send all tasks in the response
    res.status(200).json({ tasks: user.tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Assuming you have MongoDB client and other necessary imports set up

// Add a new route for fetching tasks for a specific project
app.get("/api/projects/:projectId/allTasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Find the user based on the email in the token
    const userEmail = (req.user as { email: string }).email;
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the project based on the projectId
    const projectId = req.params.projectId;
    const project = user.projects.find((proj:Project) => proj.id === projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Send all tasks for the specific project in the response
    res.status(200).json({ tasks: project.tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post(
  "/api/addTask",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { column, task } = req.body;

      const database = client.db(dbName);
      const collection = database.collection(collectionName);

      // Find the user based on the email in the token
      const userEmail = (req.user as { email: string }).email;
      const user = await collection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Ensure that the 'tasks' field exists in the user document
      if (!user.tasks) {
        user.tasks = {};
      }

      // Ensure that the specified column exists in the 'tasks' field
      if (!user.tasks[column]) {
        user.tasks[column] = [];
      }

      // Check if the task with the given ID already exists in any column
      let existingTaskIndex;
      for (const col in user.tasks) {
        existingTaskIndex = user.tasks[col].findIndex((t: Task) => t.id === task.id);
        if (existingTaskIndex !== -1) {
          // If the task with the ID exists, remove it from the current column
          user.tasks[col].splice(existingTaskIndex, 1);
          break; // Stop searching once found
        }
      }

      // Check if the task with the ID already exists in the specified column
      const existingTaskIndexInColumn = user.tasks[column].findIndex((t: Task) => t.id === task.id);

      if (existingTaskIndexInColumn !== -1) {
        // If the task with the ID exists in the specified column, update it
        user.tasks[column][existingTaskIndexInColumn] = task;
      } else {
        // If the task with the ID doesn't exist in the specified column, add a new task
        user.tasks[column].push(task);
      }

      // Update the user document in the database
      await collection.updateOne(
        { email: userEmail },
        { $set: { tasks: user.tasks } }
      );

      res.status(201).json({ message: "Task added/updated successfully" });
    } catch (error) {
      console.error("Error adding/updating task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


app.post(
  "/api/projects/:projectId/addTask",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { column, task } = req.body;
      const { projectId } = req.params;

      const database = client.db(dbName);
      const collection = database.collection(collectionName);

      // Find the user based on the email in the token
      const userEmail = (req.user as { email: string }).email;
      const user = await collection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Find the project in the user's projects array
      const project = user.projects.find((proj: Project) => proj.id === projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Ensure that the 'tasks' field exists in the project document
      if (!project.tasks) {
        project.tasks = {};
      }

      // Check if the task with the given ID exists in any column
      let existingTaskIndex;
      for (const col in project.tasks) {
        existingTaskIndex = project.tasks[col].findIndex((t: Task) => t.id === task.id);
        if (existingTaskIndex !== -1) {
          // If the task with the ID exists, remove it from the current column
          project.tasks[col].splice(existingTaskIndex, 1);
          break; // Stop searching once found
        }
      }

      // Ensure that the specified column exists in the 'tasks' field
      if (!project.tasks[column]) {
        project.tasks[column] = [];
      }

      // Add the task to the new column
      project.tasks[column].push(task);

      const updatedProjects = [...user.projects]; // Create a copy of the projects array

      const projectIndex = updatedProjects.findIndex((proj: Project) => proj.id === projectId);

      if (projectIndex !== -1) {
        // Update the project in the array
        updatedProjects[projectIndex] = {
          ...updatedProjects[projectIndex],
          tasks: { ...project.tasks },
        };

        await collection.updateOne(
          { email: userEmail },
          { $set: { projects: updatedProjects } }
        );

        return res.status(201).json({ message: "Task added/updated successfully" });
      } else {
        return res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Error adding/updating task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);





app.delete(
  "/api/deleteTask",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { column, taskId } = req.body;

      const database = client.db(dbName);
      const collection = database.collection(collectionName);

      // Find the user based on the email in the token
      const userEmail = (req.user as { email: string }).email;
      const user = await collection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Ensure that the 'tasks' field exists in the user document
      if (!user.tasks) {
        user.tasks = {};
      }

      // Ensure that the specified column exists in the 'tasks' field
      if (!user.tasks[column]) {
        user.tasks[column] = [];
      }

      // Find the index of the task with the given ID in the specified column
      const taskIndex = user.tasks[column].findIndex((t: Task) => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ error: "Task not found in the specified column" });
      }

      // Remove the task from the specified column
      user.tasks[column].splice(taskIndex, 1);

      // Update the user document in the database
      await collection.updateOne(
        { email: userEmail },
        { $set: { tasks: user.tasks } }
      );

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.delete(
  "/api/projects/:projectId/deleteTask",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { column, taskId } = req.body;
      const { projectId } = req.params;

      const database = client.db(dbName);
      const collection = database.collection(collectionName);

      // Find the user based on the email in the token
      const userEmail = (req.user as { email: string }).email;
      const user = await collection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the project in the user's projects array
      const project = user.projects.find((proj: Project) => proj.id === projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Ensure that the 'tasks' field exists in the project document
      if (!project.tasks) {
        project.tasks = {};
      }

      // Ensure that the specified column exists in the 'tasks' field
      if (!project.tasks[column]) {
        project.tasks[column] = [];
      }

      // Find the index of the task with the given ID in the specified column
      const taskIndex = project.tasks[column].findIndex((t: Task) => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ error: "Task not found in the specified column" });
      }

      // Remove the task from the specified column
      project.tasks[column].splice(taskIndex, 1);

      // Update the user document in the database
      await collection.updateOne(
        { email: userEmail },
        { $set: { projects: user.projects } }
      );

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


app.get("/api/data", authenticateToken, async (req: Request, res: Response) => {
  try {
    const database = client.db(dbName);
    const collection = database.collection(collectionName);
    const result = await collection.find({}).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error fetching data from MongoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.on("close", () => {
  client.close();
  console.log("MongoDB connection closed");
});
