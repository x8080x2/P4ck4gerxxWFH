import { applications, type Application, type InsertApplication, users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: number): Promise<Application | undefined>;
  getAllApplications(): Promise<Application[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private applications: Map<number, Application>;
  private currentUserId: number;
  private currentApplicationId: number;

  constructor() {
    this.users = new Map();
    this.applications = new Map();
    this.currentUserId = 1;
    this.currentApplicationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const application: Application = { 
      ...insertApplication,
      previousJobs: insertApplication.previousJobs ?? null,
      workspaceDescription: insertApplication.workspaceDescription ?? null,
      resumeFilename: insertApplication.resumeFilename ?? null,
      additionalDocsFilenames: insertApplication.additionalDocsFilenames ?? null,
      id,
      submittedAt: new Date()
    };
    this.applications.set(id, application);
    return application;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getAllApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }
}

export const storage = new MemStorage();
