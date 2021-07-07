import { Context } from '@azure/functions';
import { getQuote } from '../handlers/get';

describe("GET test for POC", () => {
    let context: Context;

    beforeEach(() => {
        context = ({ log: jest.fn() } as unknown) as Context;
    });

    it("should have a real test", async () => {
        await getQuote(context);
    });
});