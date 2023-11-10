// src/models/projectModel.ts

import { Task } from "./taskModel";

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}
 