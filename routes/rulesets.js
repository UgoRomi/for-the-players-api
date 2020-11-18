const { checkIfGameExists } = require("../models/game/utils")
const { userPermissionCreateRuleset } = require("../models/user/consts")
const router = require("express").Router()
const { body } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")

const Ruleset = mongoose.model("Ruleset")

router.post(
	"/",
	[
		body("game")
			.notEmpty({ ignore_whitespace: true })
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		body("maxNumberOfPlayersPerTeam")
			.not()
			.isEmpty({ ignore_whitespace: true })
			.isInt(),
		body("description").not().isEmpty({ ignore_whitespace: true }),
		body("name").not().isEmpty({ ignore_whitespace: true }),
	],
	checkJWT(userPermissionCreateRuleset),
	checkValidation,
	async (req, res, next) => {
		try {
			const { game, maxNumberOfPlayersPerTeam, description, name } = req.body
			await Ruleset.create({
				game,
				maxNumberOfPlayersPerTeam,
				description,
				name,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.get("/", checkJWT(), async (req, res, next) => {
	try {
		const rulesets = await Ruleset.find({})
		return res.status(200).json(
			rulesets.map((ruleset) => {
				return {
					name: ruleset.name,
					id: ruleset._id,
					game: ruleset.game,
					description: ruleset.description,
					maxNumberOfPlayersPerTeam: ruleset.maxNumberOfPlayersPerTeam,
				}
			})
		)
	} catch (e) {
		next(e)
	}
})

module.exports = router
