import * as data from './quotes.json'

interface Quote {
    text: string,
    from: string
}

const quotes: Quote[] = data as Quote[];

export default quotes;