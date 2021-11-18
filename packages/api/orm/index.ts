import { createConnection } from "typeorm";
import { Portfolio } from "./entity/portfolio";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import "reflect-metadata";

createConnection()
  .then(async (connection) => {
    const pd = new Portfolio();
    pd.status = ProvisioningStatus.IN_PROGRESS;
    await connection.manager.save(pd);
    console.log("Saved a new portfolio with id: " + pd.id);

    const pfs = await connection.manager.find(Portfolio);
    console.log("Loaded portfolios: ", pfs);
  })
  .catch((error) => console.log(error));
