const router = require('express').Router();
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const { checkIfGameExists } = require('../models/game/utils');
const { userPermissionRuleset } = require('../models/user/consts');
const { checkJWT, checkValidation } = require('../utils/custom-middlewares');
const { convertToMongoId } = require('../utils/custom-sanitizers');
const { checkIfRulesetExists } = require('../models/ruleset/utils');

const Ruleset = mongoose.model('Rulesets');
const Game = mongoose.model('Games');

router.post(
  '/',
  [
    body('game')
      .notEmpty({ ignore_whitespace: true })
      .isMongoId()
      .custom(checkIfGameExists),
    body('maxNumberOfPlayersPerTeam').isInt(),
    body('minNumberOfPlayersPerTeam').isInt(),
    body('description').isString().notEmpty({ ignore_whitespace: true }).trim(),
    body('name')
      .isString()
      .notEmpty({ ignore_whitespace: true })
      .isString()
      .trim()
      .escape(),
    body('maps').isArray(),
    body('bestOf').isInt(),
  ],
  checkJWT(userPermissionRuleset),
  checkValidation,
  async (req, res, next) => {
    try {
      if (req.body.bestOf > req.body.maps.length)
        return res.status(400).json([
          {
            msg: `"bestOf" cannot be bigger than the number of maps`,
            param: 'bestOf',
            location: 'body',
          },
        ]);

      const {
        game,
        maxNumberOfPlayersPerTeam,
        minNumberOfPlayersPerTeam,
        description,
        name,
        maps,
        bestOf,
      } = req.body;
      await Ruleset.create({
        game,
        maxNumberOfPlayersPerTeam,
        minNumberOfPlayersPerTeam,
        description,
        name,
        maps,
        bestOf,
      });
      return res.status(201).json();
    } catch (e) {
      next(e);
    }
  },
);

router.get("/", checkJWT(), async (req, res, next) => {
  try {
    const rulesets = await Ruleset.find({}).lean();
    const games = await Game.find({}).lean();

    return res.status(200).json(
      rulesets.map((ruleset) => {
        const { name } = games.find(
          (game) => ruleset.game.toString() === game._id.toString(),
        );

        return {
          name: ruleset.name,
          _id: ruleset._id,
          game: {
            name,
            _id: ruleset.game,
          },
          description: ruleset.description,
          maxNumberOfPlayersPerTeam: ruleset.maxNumberOfPlayersPerTeam,
          minNumberOfPlayersPerTeam: ruleset.minNumberOfPlayersPerTeam,
          maps: ruleset.maps,
          bestOf: ruleset.bestOf,
        };
      }),
    );
  } catch (e) {
    next(e);
  }
});

// Add to swagger
router.patch(
  '/:rulesetId/',
  checkJWT(),
  [
    param('rulesetId')
      .customSanitizer(convertToMongoId)
      .bail()
      .custom(checkIfRulesetExists),
    body('minNumberOfPlayer').bail(),
    body('maxNumberOfPlayer').bail(),
    body('name').bail(),
    body('description').bail(),
    body('bestOf').bail(),
    body('maps').bail(),
    body('gameId').bail(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const patchRuleset = {};

      if (req.body.minNumberOfPlayer)
        patchRuleset.minNumberOfPlayer = req.body.minNumberOfPlayer;
      if (req.body.maxNumberOfPlayer)
        patchRuleset.maxNumberOfPlayer = req.body.maxNumberOfPlayer;
      if (req.body.name) patchRuleset.name = req.body.name;
      if (req.body.description) patchRuleset.description = req.body.description;
      if (req.body.bestOf) patchRuleset.bestOf = req.body.bestOf;
      if (req.body.maps) patchRuleset.maps = req.body.maps;
      if (req.body.gameId) patchRuleset.gameId = req.body.gameId;

      await Ruleset.findByIdAndUpdate(req.params.rulesetId, {
        $set: patchRuleset,
      });

      return res.status(200).json();
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
