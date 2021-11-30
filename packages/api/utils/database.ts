import { createConnection as typeormConnection, Connection } from "typeorm";
import * as rdsIam from "atat-web-api-rds/auth/iam";
import path from "path";
import * as fs from "fs";
import { TlsOptions } from "tls";

const CA_BUNDLE_FILE = "rds-gov-ca-bundle-2017.pem";

export async function createConnection(): Promise<Connection> {
  // This check is disabled for the following block because per our function infrastructure
  // configuration these values must be set. If they aren't this this won't be recoverable
  // and the function will fail early during the connection establishment.
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const databaseName = process.env.ATAT_DATABASE_NAME!;
  const databaseWriteHost = process.env.ATAT_DATABASE_WRITE_HOST!;
  const databaseReadHost = process.env.ATAT_DATABASE_READ_HOST!;
  const databaseUser = process.env.ATAT_DATABASE_USER!;
  const databasePort = parseInt(process.env.ATAT_DATABASE_PORT!);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const writeCredentials = await rdsIam.getDatabaseCredentials({
    hostname: databaseWriteHost,
    port: databasePort,
    username: databaseUser,
  });
  const readCredentials = await rdsIam.getDatabaseCredentials({
    hostname: databaseReadHost,
    port: databasePort,
    username: databaseUser,
  });

  const sslConfig: TlsOptions = {
    minVersion: "TLSv1.2",
    ca: fs.readFileSync(path.join(__dirname, CA_BUNDLE_FILE)),
  };

  return typeormConnection({
    type: "postgres",
    replication: {
      master: {
        host: databaseWriteHost,
        port: databasePort,
        username: writeCredentials.username,
        password: writeCredentials.password,
        database: databaseName,
        ssl: sslConfig,
      },
      slaves: [
        {
          host: databaseReadHost,
          port: databasePort,
          username: readCredentials.username,
          password: readCredentials.password,
          database: databaseName,
          ssl: sslConfig,
        },
      ],
    },
    logging: "all",
    database: databaseName,
  });
}
