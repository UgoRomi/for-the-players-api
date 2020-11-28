const { checkIfGameExists } = require("../models/game/utils")
const { userPermissionRuleset } = require("../models/user/consts")
const router = require("express").Router()
const { body } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")

const Ruleset = mongoose.model("Rulesets")

router.post(
	"/",
	[
		body("game")
			.notEmpty({ ignore_whitespace: true })
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		body("maxNumberOfPlayersPerTeam")
			.notEmpty({ ignore_whitespace: true })
			.isInt(),
		body("minNumberOfPlayersPerTeam")
			.notEmpty({ ignore_whitespace: true })
			.isInt(),
		body("description").notEmpty({ ignore_whitespace: true }),
		body("name").notEmpty({ ignore_whitespace: true }),
	],
	checkJWT(userPermissionRuleset),
	checkValidation,
	async (req, res, next) => {
		try {
			const {
				game,
				maxNumberOfPlayersPerTeam,
				minNumberOfPlayersPerTeam,
				description,
				name,
			} = req.body
			await Ruleset.create({
				game,
				maxNumberOfPlayersPerTeam,
				minNumberOfPlayersPerTeam,
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
					minNumberOfPlayersPerTeam: ruleset.minNumberOfPlayersPerTeam,
				}
			})
		)
	} catch (e) {
		next(e)
	}
})

module.exports = router
