import { getDatabaseCredentials } from "./auth/secrets";
import { createConnection, Connection } from "typeorm";

import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from "aws-lambda";

import * as https from "https";
import * as url from "url";

type User = {
  name: string;
  dbPrivileges: string[];
};

const USERS: User[] = [
  {
    name: "atat-api-read",
    dbPrivileges: ["CONNECT", "SELECT"],
  },
  {
    name: "atat-api-write",
    dbPrivileges: ["CONNECT", "SELECT", "INSERT", "UPDATE", "DELETE"],
  },
  {
    name: "atat-api-admin",
    dbPrivileges: ["ALL PRIVILEGES"],
  },
];

async function connectWithoutDatabase(): Promise<Connection> {
  // This always gets set by the infrastructure code.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const dbAuth = await getDatabaseCredentials(process.env.DATABASE_SECRET_NAME!);
  return await createConnection({
    type: "postgres",
    host: process.env.DATABASE_HOST,
    port: 5432,
    username: dbAuth.username,
    password: dbAuth.password,
    logging: "all",
  });
}

async function handleCreate(databaseName: string): Promise<void> {
  const connection = await connectWithoutDatabase();

  await connection.query(`CREATE DATABASE $1 ENCODING UTF8 LOCALE en_US.utf8`, [databaseName]);
  for (const user of USERS) {
    await connection.query(`CREATE ROLE $1 WITH LOGIN IN ROLE rds_iam`, [user.name]);
    await connection.query(`GRANT $1 ON $2 TO $3`, [user.dbPrivileges.join(", "), databaseName, user.name]);
  }
}

async function handleDelete(databaseName: string): Promise<void> {
  const connection = await connectWithoutDatabase();

  for (const user of USERS) {
    await connection.query(`DROP ROLE IF EXISTS $1`, [user.name]);
  }
  await connection.query(`DROP DATABASE IF EXISTS $1 WITH FORCE`, [databaseName]);
}

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse
): Promise<void> {
  const body = JSON.stringify(response);
  const responseUrl = new url.URL(event.ResponseURL);

  const request = https.request(
    responseUrl,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "content-length": body.length,
      },
    },
    (response) => {
      console.log("Status: " + response.statusCode);
      console.log("Headers: " + JSON.stringify(response.headers));
    }
  );
  request.on("error", (error) => {
    console.log("Error sending response: " + error);
  });

  request.write(body);
  request.end();
  console.log("Response sent");
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
  console.log(JSON.stringify(event));
  const databaseName = event.ResourceProperties.DatabaseName ?? "atat";
  try {
    switch (event.RequestType) {
      case "Create":
      case "Update":
        await handleCreate(databaseName);
        break;
      case "Delete":
        await handleDelete(databaseName);
        break;
    }

    const result: CloudFormationCustomResourceResponse = {
      Status: "SUCCESS",
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: databaseName,
    };
    console.log(JSON.stringify(result));
    await sendResponse(event, result);
  } catch (err) {
    const result: CloudFormationCustomResourceResponse = {
      Status: "SUCCESS",
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: databaseName,
      Reason: JSON.stringify(err),
    };
    console.log(JSON.stringify(result));
    await sendResponse(event, result);
  }
  console.log("End of handler for request: " + event.RequestId);
}
