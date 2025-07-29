import { applications, type Application, type InsertApplication, users, type User, type InsertUser } from "@shared/schema";

// Generate random 7-character alphanumeric ID
function generateApplicationId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: number): Promise<Application | undefined>;
  getApplicationByApplicationId(applicationId: string): Promise<Application | undefined>;
  getAllApplications(): Promise<Application[]>;
  clearAllApplications(): Promise<void>;
  clearAllData(): Promise<void>;
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
    let applicationId = generateApplicationId();
    
    // Ensure unique application ID
    while (Array.from(this.applications.values()).some(app => app.applicationId === applicationId)) {
      applicationId = generateApplicationId();
    }
    
    const application: Application = { 
      ...insertApplication,
      previousJobs: insertApplication.previousJobs ?? null,
      workspaceDescription: insertApplication.workspaceDescription ?? null,
      idFrontFilename: insertApplication.idFrontFilename ?? null,
      idBackFilename: insertApplication.idBackFilename ?? null,
      id,
      applicationId,
      submittedAt: new Date()
    };
    this.applications.set(id, application);
    return application;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationByApplicationId(applicationId: string): Promise<Application | undefined> {
    return Array.from(this.applications.values()).find(
      (application) => application.applicationId === applicationId,
    );
  }

  async getAllApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async clearAllApplications(): Promise<void> {
    this.applications.clear();
    this.currentApplicationId = 1;
  }

  async clearAllData(): Promise<void> {
    this.applications.clear();
    this.users.clear();
    this.currentApplicationId = 1;
    this.currentUserId = 1;
  }
}

export const storage = new MemStorage();
