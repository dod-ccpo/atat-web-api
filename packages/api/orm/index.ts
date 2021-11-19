import { createConnection } from "typeorm";
import { Portfolio } from "./entity/portfolio";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import "reflect-metadata";
import { CloudServiceProvider } from "../models/CloudServiceProvider";
import { Application } from "./entity/application";

createConnection()
  .then(async (connection) => {
    // PORTFOLIO
    const pd = new Portfolio();
    pd.status = ProvisioningStatus.IN_PROGRESS;
    pd.name = "Cheetah portfolio";
    pd.description = "Description of portfolio";
    pd.csp = CloudServiceProvider.CSP_A;
    pd.dodComponents = ["army", "navy"];
    pd.portfolioManagers = ["jane.manager@dod.mil", "john.manager@dod.mil"];
    pd.taskOrders = "";
    pd.applications = "";
    pd.operators = "";
    await connection.manager.save(pd);
    console.log("Saved a new portfolio with id: " + pd.id);

    const pfs = await connection.manager.find(Portfolio);
    console.log("Loaded portfolios: ", pfs);

    // APPLICATION
    const app = new Application();
    app.name = "Cheetah application";
    app.description = "Description of application";
    app.environments = "";
    app.operators = "";
    await connection.manager.save(app);
    console.log("Saved a application with id: " + app.id);

    const apps = await connection.manager.find(Application);
    console.log("Loaded applications: ", apps);
  })
  .catch((error) => console.log(error));
