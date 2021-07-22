import { Context, HttpRequest } from '@azure/functions'
import dayjs from 'dayjs'
import { PortfolioStep } from '../../../lib/models/PortfolioStep'
import { PortfolioFull } from '../../../lib/models/PortfolioFull'
import { CosmosClient } from '@azure/cosmos'

export async function handler (context: Context, req: HttpRequest): Promise<void> {
  const connectionString = process.env['COSMOS-CONNECTION-STRING']
  context.log('Connecting to ' + connectionString)
  const client = new CosmosClient(connectionString)
  const id: string = req.params.portfolioDraftId
  const headers = req.headers
  if ((headers['content-type'] ?? '') !== 'application/json' || req.rawBody === req.body) {
    context.res = { body: { errorMessage: 'Input data must be valid JSON' }, status: 400 }
    return
  }

  // TODO: create these in terraform & fail fast
  const { database } = await client.databases.createIfNotExists({ id: 'atat' })
  const { container } = await database.containers.createIfNotExists({ id: 'portfolios' })

  const now: string = dayjs().format('{YYYY} MM-DDTHH:mm:ss SSS [Z] A')

  const { resource } = await container.item(id).read()
  const ps: PortfolioStep = {
    name: req.body.name,
    description: req.body.description,
    dod_components: req.body.dod_components,
    portfolio_managers: req.body.portfolio_managers
  }

  const pf: PortfolioFull = {
    ...resource,
    updated_at: now,
    portfolio: ps
  }

  await container.item(id).replace(pf)
  context.res = {
    body: pf
  }
}
