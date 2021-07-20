import { Context, HttpRequest } from '@azure/functions'
const { CosmosClient } = require("@azure/cosmos");
import { v4 as uuidv4 } from 'uuid'
import '../../lib/models/BaseDocument'
import '../../lib/models/PortfolioSummary'
import '../../lib/models/ProvisioningStatus'

export async function postPortfolioDrafts (context: Context, req: HttpRequest): Promise<void> {
    const client = new CosmosClient(process.env["COSMOS-CONNECTION-STRING"]);

    // TODO: create constants for the DB and container names
    const { database } = await client.databases.createIfNotExists({ id: "atat" });
    const { container } = await database.containers.createIfNotExists({ id: "portfolios" });

    // TODO: generate timestamps
    let pf: PortfolioSummary = {
        id: uuidv4(),
        created_at: "created at time",
        updated_at: "updated at time",
        status: ProvisioningStatus.NotStarted
    }

    // TODO: add a modicum of error handling
    let result = await container.items.create(pf);
    context.res = result.resource;
}
