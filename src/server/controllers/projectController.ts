import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/authMiddleware";
import { Project } from "../../models/projectModel";
import { Task } from "../../models/taskModel";
import client from "../../database/dbConnection";

const dbName = "test";
const collectionName = "kraftbase";

export const getProjectNames = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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
    const projectsNames = user.projects.map(
      ({ id, name }: { id: string; name: string }) => ({ id, name })
    );

    // Send the id and name of all projects in the response
    res.status(200).json({ projectsNames });
  } catch (error) {
    console.error("Error fetching project names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const createProject = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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
      return res
        .status(400)
        .json({ error: "Project with the specified ID already exists" });
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
};

export const getProjectIDAllTasks = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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
    const project = user.projects.find(
      (proj: Project) => proj.id === projectId
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Send all tasks for the specific project in the response
    res.status(200).json({ tasks: project.tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const projectAddTask = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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
    const project = user.projects.find(
      (proj: Project) => proj.id === projectId
    );

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
      existingTaskIndex = project.tasks[col].findIndex(
        (t: Task) => t.id === task.id
      );
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

    const projectIndex = updatedProjects.findIndex(
      (proj: Project) => proj.id === projectId
    );

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

      return res
        .status(201)
        .json({ message: "Task added/updated successfully" });
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    console.error("Error adding/updating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const projectDeleteTask = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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
    const project = user.projects.find(
      (proj: Project) => proj.id === projectId
    );

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
    const taskIndex = project.tasks[column].findIndex(
      (t: Task) => t.id === taskId
    );

    if (taskIndex === -1) {
      return res
        .status(404)
        .json({ error: "Task not found in the specified column" });
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
};
