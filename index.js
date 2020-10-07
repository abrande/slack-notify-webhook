const bodyParser = require("body-parser");
const express = require("express");
const utils = require("./utils");
const slackbot = require("./slackbot");
const app = express();
const PORT = 5000;

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: 'true' }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.post('/hook', utils.verifyGithubData, (req, res) => {
  if (req.body) {
    slackbot.sendMessage(req.body);
  }
  res.status(200).end(); // slack requires response within 3 seconds
});

app.get('/', (req, res) => {
  res.send('Hello World');
});
app.use((error, req, res, next) => {
  if (error) {
    console.log(error);
  }
  res.status(403).send('Request body was not signed or verification failed.');
})

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));