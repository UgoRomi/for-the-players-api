const { checkIfGameExists } = require("../models/game/utils")
const { userPermissionRuleset } = require("../models/user/consts")
const router = require("express").Router()
const { body } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")
const { checkIfRulesetExists } = require("../models/ruleset/utils")

const Ruleset = mongoose.model("Rulesets")
const Game = mongoose.model("Games")

router.post(
	"/",
	[
		body("game")
			.notEmpty({ ignore_whitespace: true })
			.isMongoId()
			.custom(checkIfGameExists),
		body("maxNumberOfPlayersPerTeam").isInt(),
		body("minNumberOfPlayersPerTeam").isInt(),
		body("description")
			.isString()
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape(),
		body("name")
			.isString()
			.notEmpty({ ignore_whitespace: true })
			.isString()
			.trim()
			.escape(),
		body("maps").isArray(),
		body("bestOf").isInt(),
	],
	checkJWT(userPermissionRuleset),
	checkValidation,
	async (req, res, next) => {
		try {
			if (req.body.bestOf > req.body.maps.length)
				return res.status(400).json([
					{
						msg: `"bestOf" cannot be bigger than the number of maps`,
						param: "bestOf",
						location: "body",
					},
				])

			const {
				game,
				maxNumberOfPlayersPerTeam,
				minNumberOfPlayersPerTeam,
				description,
				name,
				maps,
				bestOf,
			} = req.body
			await Ruleset.create({
				game,
				maxNumberOfPlayersPerTeam,
				minNumberOfPlayersPerTeam,
				description,
				name,
				maps,
				bestOf,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.get("/", checkJWT(), async (req, res, next) => {
	try {
    const rulesets = await Ruleset.find({}).lean()
    const games = await Game.find({}).lean()

		return res.status(200).json(
			rulesets.map((ruleset) => {
        
        const name = games.find(game => ruleset.game.toString() === game._id.toString()).name

				return {
					name: ruleset.name,
					id: ruleset._id,
          game: {
            name,
            id: ruleset.game,
          },
					description: ruleset.description,
					maxNumberOfPlayersPerTeam: ruleset.maxNumberOfPlayersPerTeam,
					minNumberOfPlayersPerTeam: ruleset.minNumberOfPlayersPerTeam,
					maps: ruleset.maps,
					bestOf: ruleset.bestOf,
				}
			})
		)
	} catch (e) {
		next(e)
	}
})

// Add to swagger
router.patch(
	"/:rulesetId",
	checkJWT(),
	[
		param("rulesetId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(checkIfRulesetExists),
		param("minNumberOfPlayer").bail(),
		param("maxNumberOfPlayer").bail(),
		param("name").bail(),
		param("description").bail(),
		param("bestOf").bail(),
		param("mapset").bail(),
		param("gameId").bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			let patchRuleset = {}

			if(req.params.minNumberOfPlayer) patchRuleset.minNumberOfPlayer = req.params.minNumberOfPlayer;
			if(req.params.maxNumberOfPlayer) patchRuleset.maxNumberOfPlayer = req.params.maxNumberOfPlayer;
			if(req.params.name) patchRuleset.name = req.params.name;
			if(req.params.description) patchRuleset.description = req.params.description;
			if(req.params.bestOf) patchRuleset.bestOf = req.params.bestOf;
			if(req.params.mapset) patchRuleset.mapset = req.params.mapset;
			if(req.params.gameId) patchRuleset.gameId = req.params.gameId;

			await Ruleset.findByIdAndUpdate(req.params.rulesetId, {
				$set: patchRuleset,
			})

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
