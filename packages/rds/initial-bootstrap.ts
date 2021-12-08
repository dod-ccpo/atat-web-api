import axios from "axios";
import { createConnection, Connection } from "typeorm";
import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from "aws-lambda";

import { getDatabaseCredentials } from "./auth/secrets";
import path from "path";
import * as fs from "fs";

type User = {
  name: string;
  dbPrivileges: string[];
  tablePrivileges: string[];
};

type Config = {
  databaseName: string;
  secretName: string;
  databaseHost: string;
  caBundleFile: string;
};

const USERS: User[] = [
  {
    name: "atat_api_read",
    dbPrivileges: ["CONNECT"],
    tablePrivileges: ["SELECT"],
  },
  {
    name: "atat_api_write",
    dbPrivileges: ["CONNECT"],
    tablePrivileges: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  },
  {
    name: "atat_api_admin",
    dbPrivileges: ["ALL PRIVILEGES"],
    tablePrivileges: ["ALL PRIVILEGES"],
  },
];

/**
 * Handle fetching the bundle path for both absolute and relative paths.
 * This will always return an absolute path to the file.
 */
function caBundlePath(caBundleFile: string): string {
  if (caBundleFile.startsWith("/")) {
    return caBundleFile;
  }
  return path.join(__dirname, caBundleFile);
}

async function connect(connectConfig: Config, useDatabase = true): Promise<Connection> {
  const dbAuth = await getDatabaseCredentials(connectConfig.secretName);
  return createConnection({
    type: "postgres",
    host: connectConfig.databaseHost,
    port: 5432,
    username: dbAuth.username,
    password: dbAuth.password,
    logging: "all",
    entities: ["orm/entity/**.js"],
    migrations: ["orm/migration/**.js"],
    ssl: {
      minVersion: "TLSv1.2",
      ca: fs.readFileSync(caBundlePath(connectConfig.caBundleFile)),
    },
    database: useDatabase ? connectConfig.databaseName : "postgres",
  });
}

async function dbExists(connection: Connection, dbName: string): Promise<boolean> {
  return !!(await connection.query(`SELECT * FROM pg_database WHERE datname='${dbName}';`)).length;
}

async function userExists(connection: Connection, userName: string): Promise<boolean> {
  return !!(await connection.query(`SELECT * FROM pg_roles WHERE rolname='${userName}';`)).length;
}

async function handleCreate(connectConfig: Config): Promise<void> {
  // Create the underlying database if it doesn't exist
  let connection = await connect(connectConfig, false);
  if (!(await dbExists(connection, connectConfig.databaseName))) {
    await connection.query(`CREATE DATABASE ${connectConfig.databaseName} WITH ENCODING 'UTF8'`);
  }
  await connection.close();

  // Establish a new connection to the newly-created database, which is required for
  // ALTER DEFAULT PRIVILEGES. `\connect` is not supported.
  connection = await connect(connectConfig);
  for (const user of USERS) {
    if (!(await userExists(connection, user.name))) {
      await connection.query(`CREATE ROLE ${user.name} WITH LOGIN IN ROLE rds_iam`);
    }
    await connection.query(
      `GRANT ${user.dbPrivileges.join(", ")} ON DATABASE ${connectConfig.databaseName} TO ${user.name}`
    );
    await connection.query(
      `ALTER DEFAULT PRIVILEGES GRANT ${user.tablePrivileges.join(", ")} ON TABLES TO ${user.name}`
    );
  }
  await connection.close();
}

async function handleDelete(connectConfig: Config): Promise<void> {
  const connection = await connect(connectConfig);

  for (const user of USERS) {
    await connection.query(`DROP ROLE IF EXISTS ${user.name}`);
  }
  await connection.query(`DROP DATABASE IF EXISTS ${connectConfig.databaseName} WITH FORCE`);
}

async function migrate(connectConfig: Config): Promise<void> {
  const connection = await connect(connectConfig);
  const migrations = await connection.runMigrations({ transaction: "none" });
  await connection.close();
  migrations.forEach((migration) => console.log(migration));
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

export async function baseHandler(event: CloudFormationCustomResourceEvent): Promise<void> {
  console.log(JSON.stringify(event));
  const databaseName = event.ResourceProperties.DatabaseName;
  const secretName = event.ResourceProperties.DatabaseSecretName;
  const databaseHost = event.ResourceProperties.DatabaseHost;

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

  const connectConfig: Config = {
    databaseName,
    databaseHost,
    secretName,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    caBundleFile: process.env.ATAT_RDS_CA_BUNDLE_NAME!,
  };

  try {
    switch (event.RequestType) {
      case "Create":
      case "Update":
        await handleCreate(connectConfig);
        await migrate(connectConfig);
        break;
      case "Delete":
        await handleDelete(connectConfig);
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

export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
  const result: CloudFormationCustomResourceResponse = {
    Status: "FAILED",
    RequestId: event.RequestId,
    StackId: event.StackId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: "Unknown",
    Reason: "Unknown",
  };

  try {
    await baseHandler(event);
  } catch (err: unknown) {
    result.Reason = JSON.stringify(err) ?? "Unknown Error";
    await sendResponse(event, result);
  }
}
