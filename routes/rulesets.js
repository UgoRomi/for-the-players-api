const { checkIfGameExists } = require("../models/game/utils")
const { userPermissionCreateRuleset } = require("../models/user/consts")
const router = require("express").Router()
const { body } = require("express-validator")
const {
	checkJWT,
	checkValidation,
	jsonParser,
	convertToMongoId,
} = require("../utils")
const mongoose = require("mongoose")

const Ruleset = mongoose.model("Ruleset")

router.post(
	"/",
	jsonParser,
	[
		body("game")
			.not()
			.isEmpty()
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		body("maxNumberOfPlayers").not().isEmpty().isInt(),
		body("description").not().isEmpty(),
		body("name").not().isEmpty(),
	],
	checkJWT(userPermissionCreateRuleset),
	checkValidation,
	async (req, res, next) => {
		try {
			const { game, maxNumberOfPlayers, description, name } = req.body
			await Ruleset.create({
				game,
				maxNumberOfPlayers,
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
					maxNumberOfPlayers: ruleset.maxNumberOfPlayers,
				}
			})
		)
	} catch (e) {
		next(e)
	}
})

module.exports = router
