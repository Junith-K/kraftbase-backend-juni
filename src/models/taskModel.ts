// src/models/taskModel.ts

export interface Task {
    id: string;
    name: string;
    description: string;
    dueDate: string;
    tag: string;
    priority: boolean;
  }
  