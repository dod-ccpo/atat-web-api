import { Context, HttpRequest } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'

export async function handler (context: Context, req: HttpRequest): Promise<void> {
  const connectionString = process.env['COSMOS-CONNECTION-STRING']
  context.log('Connecting to ' + connectionString)
  const client = new CosmosClient(connectionString)
  const id: string = req.params.portfolioDraftId

  // TODO: create these in terraform & fail fast
  const { database } = await client.databases.createIfNotExists({ id: 'atat' })
  const { container } = await database.containers.createIfNotExists({ id: 'portfolios' })

  const { resource } = await container.item(id).delete()

  context.res = resource?.id
    ? {
        body: {}
      }
    : {
        body: {},
        status: 404
      }
}
