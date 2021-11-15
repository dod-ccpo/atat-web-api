import { getAuthPassword } from "./auth/secrets";
import { createConnection, Connection } from "typeorm";

import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from "aws-lambda";

type User = {
  name: string;
  dbPrivileges: string[];
};

const DB_NAME = "atat";
const USERS: User[] = [
  {
    name: "atat-read",
    dbPrivileges: ["CONNECT", "SELECT"],
  },
  {
    name: "atat-write",
    dbPrivileges: ["CONNECT", "SELECT", "INSERT", "UPDATE", "DELETE"],
  },
  {
    name: "atat-admin",
    dbPrivileges: ["ALL PRIVILEGES"],
  },
];

async function connectWithoutDatabase(): Promise<Connection> {
  const dbAuth = await getAuthPassword(process.env.DATABASE_SECRET_NAME!);
  return await createConnection({
    type: "postgres",
    host: process.env.DATABASE_HOST,
    port: 3306,
    username: dbAuth.username,
    password: dbAuth.password,
    logging: true,
  });
}

async function handleCreate(): Promise<void> {
  const connection = await connectWithoutDatabase();

  await connection.query(`CREATE DATABASE $1 ENCODING UTF8 LOCALE en_US.utf8`, [DB_NAME]);
  for (const user of USERS) {
    await connection.query(`CREATE ROLE $1 WITH LOGIN IN ROLE rds_iam`, [user.name]);
    await connection.query(`GRANT $1 ON $2 TO $3`, [user.dbPrivileges.join(", "), DB_NAME, user.name]);
  }
}

async function handleDelete(): Promise<void> {
  const connection = await connectWithoutDatabase();

  for (const user of USERS) {
    await connection.query(`DROP ROLE IF EXISTS $1`, [user.name]);
  }
  await connection.query(`DROP DATABASE IF EXISTS $1 WITH FORCE`, [DB_NAME]);
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
  try {
    switch (event.RequestType) {
      case "Create":
        await handleCreate();
        break;
      case "Update":
        break;
      case "Delete":
        await handleDelete();
        break;
    }

    return {
      Status: "SUCCESS",
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: DB_NAME,
    };
  } catch (err) {
    return {
      Status: "FAILED",
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: DB_NAME,
      Reason: err,
    };
  }
}
