import { createConnection as typeormConnection, Connection } from "typeorm";
import * as rdsIam from "atat-web-api-rds/auth/iam";
import path from "path";
import * as fs from "fs";

const CA_BUNDLE_FILE = "rds-gov-ca-bundle-2017.pem";

export async function createConnection(readOnly = false): Promise<Connection> {
  const databaseName = process.env.ATAT_DATABASE_NAME!;
  const databaseHost = (readOnly ? process.env.ATAT_DATABASE_READ_HOST : process.env.ATAT_DATABASE_WRITE_HOST)!;
  const databaseUser = process.env.ATAT_DATABASE_USER!;
  const databasePort = parseInt(process.env.ATAT_DATABASE_PORT!);

  const credentials = await rdsIam.getDatabaseCredentials({
    hostname: databaseHost,
    port: databasePort,
    username: databaseUser,
  });

  return typeormConnection({
    type: "postgres",
    host: databaseHost,
    port: databasePort,
    username: credentials.username,
    password: credentials.password,
    logging: "all",
    ssl: {
      minVersion: "TLSv1.2",
      ca: fs.readFileSync(path.join(__dirname, CA_BUNDLE_FILE)),
    },
    database: databaseName,
  });
}
