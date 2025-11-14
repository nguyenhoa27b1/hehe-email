export enum Role {
  Admin = 'Admin',
  User = 'User',
  Viewer = 'Viewer',
}

export enum Status {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatarUrl: string;
}

export interface File {
  id: number;
  originalName: string;
  uploaderId: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assigneeId: number;
  creatorId: number;
  deadline: Date;
  status: Status;
  priority?: Priority;
  score?: number;
  submissionFile?: File;
  submittedAt?: Date;
}