const { YahooFinance } = require('yahoo-finance2');
const yahooFinance = new YahooFinance();
yahooFinance.quoteSummary('MC.BK', { modules: ['summaryDetail'] }).then(res => {
  console.log('dividendRate:', res.summaryDetail?.dividendRate);
  console.log('trailingAnnualDividendRate:', res.summaryDetail?.trailingAnnualDividendRate);
});
