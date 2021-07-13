import { Context } from '@azure/functions'
import { addQuote } from '../handlers/post'

describe('POST test for POC', () => {
  let context: Context

  beforeEach(() => {
    context = ({ log: jest.fn() } as unknown) as Context
  })

  it('should add a quote', async () => {
    const req = {
      query: {},
      method: null,
      url: '',
      headers: {},
      params: {},
      body: {
        text: 'What is your name?',
        from: 'The BridgeKeeper'
      }
    }
    await addQuote(context, req)
    expect(context.res.body).toBe('(mock) Added quote: ' + JSON.stringify(req.body))
  })

  it('should return no post body', async () => {
    const req = {
      query: {},
      method: null,
      url: '',
      headers: {},
      params: {}
    }

    await addQuote(context, req)
    expect(context.res.body).toEqual('No POST body')
  })
})
