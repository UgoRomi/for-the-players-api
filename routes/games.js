const router = require('express').Router();
const mongoose = require('mongoose');
const { body } = require('express-validator');
const { checkImgInput } = require('../utils/helpers');
const { checkJWT, checkValidation } = require('../utils/custom-middlewares');
const { userPermissionGame } = require('../models/user/consts');
const { checkIfValidImageData } = require('../utils/custom-validators');
const { checkUniqueName } = require('../models/game/utils');

const Game = mongoose.model('Games');

router.get('/', checkJWT(), async (req, res, _next) => {
  // Get all games
  const games = await Game.find({}, 'name _id imgUrl');

  return res.status(200).json(games);
});

router.post(
  '/',
  checkJWT([userPermissionGame]),
  [
    body('name')
      .notEmpty({ ignore_whitespace: true })
      .trim()
      .escape()
      .custom(checkUniqueName),
    body('imgUrl').optional().isURL(),
    body('imgBase64').isBase64().custom(checkIfValidImageData),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const imageURL = await checkImgInput(req.body);

      await Game.create({
        name: req.body.name,
        addedBy: req.user.id,
        imgUrl: imageURL,
      });
      return res.status(201).json();
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
