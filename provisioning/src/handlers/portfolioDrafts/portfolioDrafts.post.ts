import { Context, HttpRequest } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'
import { v4 as uuidv4 } from 'uuid'
import '../../lib/models/BaseDocument'
import '../../lib/models/PortfolioSummary'
import '../../lib/models/ProvisioningStatus'

export async function postPortfolioDrafts (context: Context, req: HttpRequest): Promise<void> {
    const client = new CosmosClient(process.env["COSMOS-CONNECTION-STRING"]);

    // TODO: create constants for the DB and container names
    const { database } = await client.databases.createIfNotExists({ id: "atat" });
    const { container } = await database.containers.createIfNotExists({ id: "portfolios" });

    let now = JSON.stringify(new Date());
    let pf: PortfolioSummary = {
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        status: ProvisioningStatus.NotStarted
    }

    // TODO: add a modicum of error handling
    let result = await container.items.create(pf);
    context.res = result.resource;
}
