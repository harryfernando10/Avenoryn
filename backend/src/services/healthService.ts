import { checkDatabaseReadiness } from "./databaseService.js";

export type HealthStatus = {
  status: "ok";
  service: "avenoryn-backend";
};

export type ReadinessStatus = {
  status: "ready" | "not_ready";
  service: "avenoryn-backend";
  database: "up" | "down" | "unconfigured";
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "avenoryn-backend",
  };
}

export async function getReadinessStatus(): Promise<ReadinessStatus> {
  const db = await checkDatabaseReadiness();

  if (!db.configured) {
    return {
      status: "not_ready",
      service: "avenoryn-backend",
      database: "unconfigured",
    };
  }

  if (!db.connected) {
    return {
      status: "not_ready",
      service: "avenoryn-backend",
      database: "down",
    };
  }

  return {
    status: "ready",
    service: "avenoryn-backend",
    database: "up",
  };
}
