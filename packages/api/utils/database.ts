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

  // The difference in the credentials here, as seen by the parameters, has little to do
  // with properly selecting a read user or a write user (though we could) but instead
  // around ensuring that we configure the credentials correctly for each host. A read-only
  // user who connects to the write host can still only perform reads. A read-write user
  // who connects to the read host can only perform reads.
  // The AWSv4 algorithm takes the host into consideration when generating the signature
  // which is why that field matters; when we're connecting to the RO endpoint, we should
  // use its name to generate the signature.
  //
  // TODO: Determine whether the RO endpoint accepts credentials for the regular write
  // endpoint (or whether it requires them, honestly.) Adjust the above comment depending
  // on what the truth actually is. This might be entirely incorrect and we may always
  // have to use the write host in which case we can just use a single set of credentials.
  // Honestly, using IAM to connect to the Aurora Cluster read endpoint doesn't really seem
  // to be especially thoroughly documented anywhere.
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
