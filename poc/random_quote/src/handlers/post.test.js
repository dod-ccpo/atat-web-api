const underTest = require('./post');

test('i guess this is ok', () => {
    var context = {};
    var req = {
        body: {
            "text": "What is your name?",
            "from": "The BridgeKeeper"
        }
    };
    underTest.addQuote(context, req);
    expect(context.res.body).toBe("(mock) Added quote: " + JSON.stringify(req.body));
});