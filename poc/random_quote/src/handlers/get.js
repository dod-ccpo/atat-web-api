'use strict';
const quotes = require('../quotes');

module.exports.getQuote = async function(context, req) {
  context.res = {
    body: quotes[Math.floor(Math.random() * quotes.length + 1)]
  };
};
