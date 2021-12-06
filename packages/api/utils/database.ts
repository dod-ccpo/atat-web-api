import { createConnection as typeormConnection, Connection } from "typeorm";
import * as rdsIam from "atat-web-api-rds/auth/iam";
import path from "path";
import * as fs from "fs";
import { TlsOptions } from "tls";

let CONNECTION: Connection | undefined;

export async function createConnection(): Promise<Connection> {
  if (CONNECTION !== undefined && CONNECTION.isConnected) {
    console.log("Reusing connection");
    return CONNECTION;
  }
  // This check is disabled for the following block because per our function infrastructure
  // configuration these values must be set. If they aren't this this won't be recoverable
  // and the function will fail early during the connection establishment.
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const databaseName = process.env.ATAT_DATABASE_NAME!;
  const databaseWriteHost = process.env.ATAT_DATABASE_WRITE_HOST!;
  const databaseReadHost = process.env.ATAT_DATABASE_READ_HOST!;
  const databaseUser = process.env.ATAT_DATABASE_USER!;
  const databasePort = parseInt(process.env.ATAT_DATABASE_PORT!);
  const caBundleFile = process.env.ATAT_RDS_CA_BUNDLE_NAME!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  // Because the AWSv4 signature algorithm takes the host into account when creating the
  // credentials, we *likely* need to include the host we plan to authenticate to as part
  // of the generation; however, it is unclear whether Aurora Cluster Read Endpoints are
  // treated as a separate "host" for authentication from the main Aurora Cluster Endpoint.
  // We don't have a great way to test this because TypeORM does not use the read host(s) for
  // `query` invocations, which are the only things created in the code base at the time
  // this was implemented. We would need to perform SELECTs on entities defined via TypeORM
  // for it to leverage the read replicas; therefore, we may not see failures in credential
  // generation until we implement our first GET function. If we do, the likely fix is to
  // use a single set of credentials using only the `databaseWriteHost` credentials.
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

  const caBundlePath = caBundleFile.startsWith("/") ? caBundleFile : path.join(__dirname, caBundleFile);

  const sslConfig: TlsOptions = {
    minVersion: "TLSv1.2",
    ca: fs.readFileSync(caBundlePath),
  };

  console.info(`Establishing connection to ${databaseWriteHost} and ${databaseReadHost}`);
  CONNECTION = await typeormConnection({
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
      // Only one read host should ever be configured, and that is the cluster read endpoint
      // for the Aurora Cluster. The host should always be set to the value of the
      // `databaseReadHost` variable (regardless of what hostname is used to generate credentials).
      // Load balancing is handled automatically be the Aurora Cluster.
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
  return CONNECTION;
}
