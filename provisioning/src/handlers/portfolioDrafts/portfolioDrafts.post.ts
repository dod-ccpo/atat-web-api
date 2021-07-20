import { Context } from '@azure/functions'

export async function getQuote (context: Context): Promise<void> {
    context.log('getQuote function triggered from http request.')

}
