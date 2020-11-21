const { userPermissionCreateTournament } = require("../models/user/consts")
const { types, teamRoleLeader } = require("../models/tournament/consts")
const { body, query } = require("express-validator")
const { convertToMongoId, toISO } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkUniqueName,
	checkTeamNameInTournament,
} = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const { checkImgInput } = require("../utils/helpers")
const { checkIfRulesetExists } = require("../models/ruleset/utils")
const { checkIfPlatformExists } = require("../models/platform/utils")
const { checkIfGameExists } = require("../models/game/utils")

const Tournament = mongoose.model("Tournament")
const Ruleset = mongoose.model("Ruleset")
const Game = mongoose.model("Game")

router.post(
	"/",
	checkJWT(userPermissionCreateTournament),
	[
		body("name").notEmpty({ ignore_whitespace: true }).custom(checkUniqueName),
		body("game")
			.notEmpty({ ignore_whitespace: true })
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		body("platform")
			.notEmpty({ ignore_whitespace: true })
			.customSanitizer(convertToMongoId)
			.custom(checkIfPlatformExists),
		body("show").isBoolean(),
		body("startsOn")
			.notEmpty({ ignore_whitespace: true })
			.isDate()
			.customSanitizer(toISO),
		body("endsOn")
			.notEmpty({ ignore_whitespace: true })
			.isDate()
			.customSanitizer(toISO),
		body("ruleset")
			.notEmpty({ ignore_whitespace: true })
			.customSanitizer(convertToMongoId)
			.custom(checkIfRulesetExists),
		body("type").isIn(types),
		body("imgUrl").optional().isURL(),
		body("imgBase64").isBase64().custom(checkIfValidaImageData),
	],
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

			const imageURL = await checkImgInput(req.body)

			await Tournament.create({
				name,
				game,
				platform,
				show,
				startsOn,
				endsOn,
				ruleset,
				type,
				imgUrl: imageURL,
				createdBy: req.user.id,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.get(
	"/",
	checkJWT(),
	[
		query("gameId")
			.optional()
			.isAlphanumeric()
			.customSanitizer(convertToMongoId)
			.custom(checkIfGameExists),
		query("type").optional().isString().isIn(types),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const findQuery = { show: true }

			if (req.query.gameId) findQuery.game = req.query.gameId
			if (req.query.type) findQuery.type = req.query.type

			const tournaments = await Tournament.find(findQuery).lean()
			const result = await Promise.all(
				tournaments.map(async (tournament) => {
					const { name, startsOn, endsOn, type, imgUrl } = tournament
					const rulesetDoc = await Ruleset.findById(
						tournament.ruleset.toString()
					).lean()
					const gameDoc = await Game.findById(tournament.game.toString()).lean()
					return {
						name,
						id: tournament._id,
						startsOn,
						endsOn,
						ruleset: rulesetDoc.name,
						type,
						numberOfTeams: tournament.teams.length,
						imgUrl,
						game: gameDoc.name,
					}
				})
			)
			return res.json(result)
		} catch (e) {
			next(e)
		}
	}
)

router.post(
	"/:tournamentId/team",
	checkJWT(),
	[
		body("name")
			.notEmpty({ ignore_whitespace: true })
			.custom(checkTeamNameInTournament),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const newTeam = {
				name: req.body.name,
				members: [{ role: teamRoleLeader, userId: req.userId }],
			}
			await Tournament.findByIdAndUpdate(req.params.tournamentId, {
				$push: { teams: newTeam },
			})
			return res
				.status(201)
				.json({ msg: `${req.body.name} added to tournament` })
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
