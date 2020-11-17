const { userPermissionCreateTournament } = require("../models/user/consts")
const { types } = require("../models/tournament/consts")
const { body } = require("express-validator")
const {
	checkJWT,
	checkValidation,
	jsonParser,
	convertToMongoId,
	toISO,
} = require("../utils")
const router = require("express").Router()
const { checkUniqueName } = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { checkIfRulesetExists } = require("../models/ruleset/utils")
const { checkIfPlatformExists } = require("../models/platform/utils")
const { checkIfGameExists } = require("../models/game/utils")

const Tournament = mongoose.model("Tournament")

router.post(
	"/",
	jsonParser,
	[
		body("name").not().isEmpty().custom(checkUniqueName),
		body("game")
			.not()
			.isEmpty()
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		body("platform")
			.not()
			.isEmpty()
			.customSanitizer(convertToMongoId)
			.custom(checkIfPlatformExists),
		body("show").isBoolean(),
		body("startsOn").not().isEmpty().isDate().customSanitizer(toISO),
		body("endsOn").not().isEmpty().isDate().customSanitizer(toISO),
		body("ruleset")
			.not()
			.isEmpty()
			.customSanitizer(convertToMongoId)
			.custom(checkIfRulesetExists),
		body("type").isIn(types),
	],
	checkJWT(userPermissionCreateTournament),
	checkValidation,
	async (req, res, next) => {
		try {
			const {
				name,
				game,
				platform,
				show,
				startsOn,
				endsOn,
				ruleset,
				type,
			} = req.body
			await Tournament.create({
				name,
				game,
				platform,
				show,
				startsOn,
				endsOn,
				ruleset,
				type,
				createdBy: req.user.id,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
