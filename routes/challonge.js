const router = require("express").Router();
const got = require("got");
const { checkJWT } = require("../utils/custom-middlewares");

router.all("*", checkJWT(), async (req, res, next) => {
  try {
    const { body: requestBody, url, method } = req;
    requestBody.api_key = process.env.CHALLONGE_API_KEY;
    let response;

    if (method === "GET") {
      response = await got.get(`${process.env.CHALLONGE_URL}${url}`, {
        searchParams: { api_key: process.env.CHALLONGE_API_KEY },
      });
    } else if (method === "POST") {
      response = await got.post(`${process.env.CHALLONGE_URL}${url}`, {
        json: requestBody,
      });
    } else if (method === "PATCH") {
      response = await got.patch(`${process.env.CHALLONGE_URL}${url}`, {
        json: requestBody,
      });
    }
    return res.json(JSON.parse(response.body));
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
