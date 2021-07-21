import { Context, HttpRequest } from '@azure/functions'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { PortfolioSummary } from '../../lib/models/PortfolioSummary'
import { ProvisioningStatus } from '../../lib/models/ProvisioningStatus'
const { CosmosClient } = require('@azure/cosmos')

export async function handler (context: Context, req: HttpRequest): Promise<void> {
  const connectionString = process.env['COSMOS-CONNECTION-STRING']
  context.log('Connecting to ' + connectionString)
  const client = new CosmosClient(connectionString)

  // TODO: create these in terraform & fail fast
  const { database } = await client.databases.createIfNotExists({ id: 'atat' })
  const { container } = await database.containers.createIfNotExists({ id: 'portfolios' })

  const now: string = dayjs().format('{YYYY} MM-DDTHH:mm:ss SSS [Z] A')
  // TODO: generate UUID for ID, generate timestamps
  const pf: PortfolioSummary = {
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    status: ProvisioningStatus.NotStarted
  }

  // TODO: add a modicum of error handling
  await container.items.create(pf)
  context.res = {
    body: pf
  }
}
