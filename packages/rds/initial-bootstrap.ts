import axios from "axios";
import { createConnection, Connection } from "typeorm";
import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from "aws-lambda";

import { getDatabaseCredentials } from "./auth/secrets";
import path from "path";
import * as fs from "fs";

type User = {
  name: string;
  dbPrivileges: string[];
};

const USERS: User[] = [
  {
    name: "atat_api_read",
    dbPrivileges: ["CONNECT", "SELECT"],
  },
  {
    name: "atat_api_write",
    dbPrivileges: ["CONNECT", "SELECT", "INSERT", "UPDATE", "DELETE"],
  },
  {
    name: "atat_api_admin",
    dbPrivileges: ["ALL PRIVILEGES"],
  },
];

async function connectWithoutDatabase(secretName: string, host: string, caBundle: string): Promise<Connection> {
  const dbAuth = await getDatabaseCredentials(secretName);
  return await createConnection({
    type: "postgres",
    host: host,
    port: 5432,
    username: dbAuth.username,
    password: dbAuth.password,
    logging: "all",
    ssl: {
      minVersion: "TLSv1.2",
      ca: fs.readFileSync(path.join(__dirname, caBundle)),
    },
  });
}

async function dbExists(connection: Connection, dbName: string): Promise<boolean> {
  return !!(await connection.query(`SELECT * FROM pg_database WHERE datname='${dbName}';`)).length;
}

async function userExists(connection: Connection, userName: string): Promise<boolean> {
  return !!(await connection.query(`SELECT * FROM pg_roles WHERE rolname='${userName}';`)).length;
}

async function handleCreate(connection: Connection, databaseName: string): Promise<void> {
  if (!dbExists(connection, databaseName)) {
    await connection.query(`CREATE DATABASE ${databaseName} WITH ENCODING 'UTF8'`);
  }
  for (const user of USERS) {
    if (!userExists(connection, user.name)) {
      await connection.query(`CREATE ROLE ${user.name} WITH LOGIN IN ROLE rds_iam`);
    }
    await connection.query(`GRANT ${user.dbPrivileges.join(", ")} ON DATABASE ${databaseName} TO ${user.name}`);
  }
}

async function handleDelete(connection: Connection, databaseName: string): Promise<void> {
  for (const user of USERS) {
    await connection.query(`DROP ROLE IF EXISTS ${user.name}`);
  }
  await connection.query(`DROP DATABASE IF EXISTS ${databaseName} WITH FORCE`);
}

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse
): Promise<void> {
  const body = JSON.stringify(response);
  console.log("Result body: " + body);

  const cfnResponse = await axios.put(event.ResponseURL, body);
  console.log("Status: " + cfnResponse.status);
  console.log("Headers: " + JSON.stringify(cfnResponse.headers));
  console.log("Response: " + cfnResponse.data);
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
  console.log(JSON.stringify(event));
  const databaseName = event.ResourceProperties.DatabaseName;
  const secretName = event.ResourceProperties.DatabaseSecretName;
  const databaseHost = event.ResourceProperties.DatabaseHost;
  const certBundleName = "rds-ca-2017.pem";

  const resultBase = {
    RequestId: event.RequestId,
    StackId: event.StackId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: databaseName,
  };

  if (!databaseName || !secretName || !databaseHost) {
    const result: CloudFormationCustomResourceResponse = {
      Status: "FAILED",
      Reason: "DatabaseName, DatabaseSecretName, and DatabaseHost are required parameters",
      ...resultBase,
    };
    console.log(JSON.stringify(result));
    await sendResponse(event, result);
    return;
  }

  try {
    const connection = await connectWithoutDatabase(secretName, databaseHost, certBundleName);

    switch (event.RequestType) {
      case "Create":
      case "Update":
        await handleCreate(connection, databaseName);
        break;
      case "Delete":
        await handleDelete(connection, databaseName);
        break;
    }

    const result: CloudFormationCustomResourceResponse = {
      Status: "SUCCESS",
      ...resultBase,
    };
    console.log(JSON.stringify(result));
    await sendResponse(event, result);
  } catch (err) {
    const result: CloudFormationCustomResourceResponse = {
      Status: "FAILED",
      Reason: JSON.stringify(err),
      ...resultBase,
    };
    console.log(JSON.stringify(result));
    await sendResponse(event, result);
  }
  console.log("End of handler for request: " + event.RequestId);
}
