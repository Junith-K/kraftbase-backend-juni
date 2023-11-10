import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/authMiddleware";
import { Task } from "../../models/taskModel";
import client from "../../database/dbConnection";

const dbName = "test";
const collectionName = "kraftbase";

export const getAllTasks = async (req: AuthenticatedRequest, res: Response) => {
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
};

export const addTasks = async (req: AuthenticatedRequest, res: Response) => {
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
      existingTaskIndex = user.tasks[col].findIndex(
        (t: Task) => t.id === task.id
      );
      if (existingTaskIndex !== -1) {
        // If the task with the ID exists, remove it from the current column
        user.tasks[col].splice(existingTaskIndex, 1);
        break; // Stop searching once found
      }
    }

    // Check if the task with the ID already exists in the specified column
    const existingTaskIndexInColumn = user.tasks[column].findIndex(
      (t: Task) => t.id === task.id
    );

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
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
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
    const taskIndex = user.tasks[column].findIndex(
      (t: Task) => t.id === taskId
    );

    if (taskIndex === -1) {
      return res
        .status(404)
        .json({ error: "Task not found in the specified column" });
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
};
