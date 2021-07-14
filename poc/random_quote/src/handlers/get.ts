import { Context } from '@azure/functions'

import quotes from '../util/quotes_helper'

export async function getQuote (context: Context): Promise<void> {
  context.log('getQuote function triggered from http request.')

  context.res = {
    body: quotes[Math.floor(Math.random() * quotes.length + 1)]
  }
}
