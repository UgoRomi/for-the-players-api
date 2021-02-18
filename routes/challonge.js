const router = require('express').Router();
const got = require('got');
const { checkJWT } = require('../utils/custom-middlewares');

const CHALLONGE_BASE_URL = 'https://api.challonge.com';

router.all('*', checkJWT(), async (req, res, next) => {
  try {
    const { body, url, method } = req;
    body.api_key = process.env.CHALLONGE_API_KEY;
    let response;

    if (method === 'GET') {
      response = await got.get(`${CHALLONGE_BASE_URL}${url}`, {
        searchParams: { api_key: process.env.CHALLONGE_API_KEY },
      });
    } else if (method === 'POST') {
      response = await got.post(`${CHALLONGE_BASE_URL}${url}`, {
        body,
      });
    } else if (method === 'PATCH') {
      response = await got.patch(`${CHALLONGE_BASE_URL}${url}`, {
        body,
      });
    }
    return res.json(JSON.parse(response.body));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
