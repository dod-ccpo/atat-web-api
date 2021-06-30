'use strict';

module.exports.addQuote = async function(context, req) {
  if (req.body) {
    context.res = {
      body: "(mock) Added quote: " + JSON.stringify(req.body)
    };
  }
  else {
    context.res = {
      body: "No POST body"
    };
  }
};
