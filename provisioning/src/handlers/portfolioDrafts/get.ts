import { Context } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'

export async function handler (context: Context): Promise<void> {
  const connectionString = process.env['COSMOS-CONNECTION-STRING']
  context.log('Connecting to ' + connectionString)
  const client = new CosmosClient(connectionString)

  // TODO: create these in terraform & fail fast
  const { database } = await client.databases.createIfNotExists({ id: 'atat' })
  const { container } = await database.containers.createIfNotExists({ id: 'portfolios' })

  // TODO: add a modicum of error handling
  const results = await container.items.readAll().fetchAll();
  context.res = {
    body: results
  }
}
