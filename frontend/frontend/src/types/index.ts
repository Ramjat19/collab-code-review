// Shared interfaces for the application
export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface Comment {
  _id?: string;
  text: string;
  user: User;
  createdAt: string;
}

export interface Snippet {
  _id: string;
  title: string;
  code: string;
  author: User;
  comments: Comment[];
  project: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  owner: User;
  collaborators: User[];
  createdAt: string;
  updatedAt: string;
}