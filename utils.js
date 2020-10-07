const crypto = require("crypto");
const config = require("./config");
const sigHeaderName = 'X-Hub-Signature'
require('dotenv').config();

const verifyGithubData = (req, res, next) => {
  const payload = JSON.stringify(req.body);
  if (!payload) {
    return next('Request body empty');
  }
  const sig = req.get(sigHeaderName) || '';
  const hmac = crypto.createHmac('sha1', config.GITHUB_WEBHOOK_SECRET)
  const digest = Buffer.from('sha1=' + hmac.update(payload).digest('hex'), 'utf8')
  const checksum = Buffer.from(sig, 'utf8')

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return next(`Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`)
  }
  return next();
}

module.exports = {
  verifyGithubData
};