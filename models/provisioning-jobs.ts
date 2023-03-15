import { ClassificationLevel, CloudDistinguisher, TaskOrder } from "../api/client";

export enum ProvisionRequestType {
  ADD_PORTFOLIO = "ADD_PORTFOLIO",
  ADD_ENVIRONMENT = "ADD_ENVIRONMENT",
  ADD_ADMINISTRATOR = "ADD_ADMINISTRATOR",
  ADD_TASK_ORDER = "ADD_TASK_ORDER",
  UPDATE_TASK_ORDER = "UPDATE_TASK_ORDER",
}

export interface Administrator {
  email: string;
  dodId: string;
  needsReset: boolean;
}

export interface NewPortfolioPayload {
  name: string;
  taskOrders: Array<TaskOrder>;
}

export interface NewEnvironmentPayload {
  name: string;
  administrators: Array<Administrator>;
  classificationLevel: ClassificationLevel;
  cloudDistinguisher: CloudDistinguisher;
}

export interface NewTaskOrderPayload {
  taskOrder: TaskOrder;
}

export interface AdministratorPayload {
  administrators: Array<Administrator>;
}

export interface HothProvisionRequest {
  jobId: string;
  userId: string;
  portfolioId?: string;
  operationType: ProvisionRequestType;
  targetCspName: string;
  payload: NewPortfolioPayload | NewEnvironmentPayload | NewTaskOrderPayload | AdministratorPayload;
}

export interface AsyncProvisionRequest extends HothProvisionRequest {
  location: string;
}
