import "reflect-metadata";
import { createConnection } from "typeorm";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import { CloudServiceProvider } from "../models/CloudServiceProvider";
import { Portfolio } from "./entity/portfolio";
import { Application } from "./entity/application";
import { Environment } from "./entity/environment";
import { TaskOrder } from "./entity/taskOrder";
import { v4 as uuidv4 } from "uuid";
import { FileScanStatus } from "../models/FileMetadata";

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

    // ENVIRONMENT
    const env = new Environment();
    env.name = "Cheetah environment";
    env.operators = "";
    await connection.manager.save(env);
    console.log("Saved a environment with id: " + env.id);

    const envs = await connection.manager.find(Environment);
    console.log("Loaded environments: ", envs);

    // TASK ORDER
    const to = new TaskOrder();
    to.taskOrderNumber = "123412341234";
    to.fileId = uuidv4();
    to.fileName = "to123412341234.pdf";
    to.fileSize = 7823649;
    to.fileScanStatus = FileScanStatus.PENDING;
    to.clins = "";
    await connection.manager.save(to);
    console.log("Saved a task order with id: " + to.id);

    const tos = await connection.manager.find(TaskOrder);
    console.log("Loaded task orders: ", tos);
  })
  .catch((error) => console.log(error));
