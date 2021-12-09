import "reflect-metadata";
import middy from "@middy/core";
import { APIGatewayProxyWithCognitoAuthorizerEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { CloudServiceProvider, DodComponent, Portfolio } from "../orm/entity/Portfolio";
import { Application } from "../orm/entity/Application";
import { Environment } from "../orm/entity/Environment";
import { TaskOrder, FileScanStatus } from "../orm/entity/TaskOrder";
import { Clin } from "../orm/entity/Clin";
import { ProvisioningStatus } from "../orm/entity/ProvisionableEntity";

import { createConnection } from "./utils/database";
import { IpCheckerMiddleware } from "./utils/ipLogging";

async function baseHandler(
  event: APIGatewayProxyWithCognitoAuthorizerEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const connection = await createConnection();
    const queries = [`SELECT current_database();`, `SELECT * FROM pg_catalog.pg_tables;`];

    const pd = new Portfolio();
    pd.provisioningStatus = ProvisioningStatus.PENDING;
    pd.name = "Cheetah portfolio";
    pd.description = "Description of portfolio";
    pd.csp = CloudServiceProvider.CSP_A;
    pd.dodComponents = [DodComponent.ARMY, DodComponent.NAVY];
    pd.owner = "Lucky";
    pd.portfolioManagers = ["jane.manager@dod.mil", "john.manager@dod.mil"];
    // pd.operators = "";
    await connection.manager.save(pd);
    console.log("Saved a new portfolio with id: " + pd.id);

    const pfs = await connection.manager.find(Portfolio);
    console.log("Loaded portfolios: ", pfs);

    // APPLICATION
    const app = new Application();
    app.portfolio = pd;
    app.name = "Cheetah application";
    app.description = "Description of application";
    // app.operators = "";
    await connection.manager.save(app);
    console.log("Saved a application with id: " + app.id);

    const apps = await connection.manager.find(Application);
    console.log("Loaded applications: ", apps);

    // ENVIRONMENT
    const env = new Environment();
    env.application = app;
    env.name = "Cheetah environment";
    // env.operators = "";
    await connection.manager.save(env);
    console.log("Saved a environment with id: " + env.id);

    const envs = await connection.manager.find(Environment);
    console.log("Loaded environments: ", envs);

    // TASK ORDER
    const to = new TaskOrder();
    to.portfolio = pd;
    to.taskOrderNumber = "123412341234";
    to.fileId = "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3";
    to.fileName = "to123412341234.pdf";
    to.fileSize = 7823649;
    to.fileScanStatus = FileScanStatus.PENDING;
    await connection.manager.save(to);
    console.log("Saved a task order with id: " + to.id);

    const tos = await connection.manager.find(TaskOrder);
    console.log("Loaded task orders: ", tos);

    // CLIN
    const clin = new Clin();
    clin.taskOrder = to;
    clin.clinNumber = "0001";
    clin.idiqClin = "idiq clin 1001";
    clin.totalClinValue = 99999999999999.98;
    clin.obligatedFunds = 0.01;
    clin.popStartDate = new Date("01-Jan-2021");
    clin.popEndDate = new Date("31-Dec-2021");
    await connection.manager.save(clin);
    console.log("Saved a clin with id: " + clin.id);

    const clins = await connection.manager.find(Clin);
    console.log("Loaded clins: ", clins);

    // Retrieve relations
    const portfolioRelations = await connection
      .getRepository(Portfolio)
      .find({ relations: ["applications", "taskOrders"] });
    console.log("Portfolio and child objects: ", portfolioRelations[0]);

    const applicationRelations = await connection.getRepository(Application).find({ relations: ["environments"] });
    console.log("Application and child objects: ", applicationRelations[0]);

    const taskOrderRelations = await connection.getRepository(TaskOrder).find({ relations: ["clins"] });
    console.log("Task Order and child objects: ", taskOrderRelations[0]);

    for (const query of queries) {
      console.log(
        JSON.stringify({
          query: query,
          result: await connection.query(query),
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "200", message: "Hello, world" }),
    };
  } catch (err) {
    console.log("ERROR: " + JSON.stringify(err));
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "500", error: "Unknown" }),
    };
  }
}

export const handler = middy(baseHandler).use(IpCheckerMiddleware());
