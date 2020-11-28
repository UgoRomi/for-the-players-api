const { userPermissionTournament } = require("../models/user/consts")
const { userExistsById } = require("../models/user/utils")
const {
	types,
	teamRoleLeader,
	teamStatusNotOk,
	teamStatusOk,
} = require("../models/tournament/consts")
const { body, query, param } = require("express-validator")
const { convertToMongoId, toISO } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkUniqueName,
	checkTeamNameInTournament,
	checkTournamentExists,
	checkTeamExists,
} = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const { checkImgInput } = require("../utils/helpers")
const { checkIfRulesetExists } = require("../models/ruleset/utils")
const { checkIfPlatformExists } = require("../models/platform/utils")
const { checkIfGameExists } = require("../models/game/utils")

const Tournament = mongoose.model("Tournaments")
const Ruleset = mongoose.model("Rulesets")
const Game = mongoose.model("Games")
const Invite = mongoose.model("Invites")

router.post(
	"/",
	checkJWT(userPermissionTournament),
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
	"/:tournamentId/teams",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		body("name")
			.notEmpty({ ignore_whitespace: true })
			.custom(checkTeamNameInTournament),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			if (
				tournament.teams.some((tournament) =>
					tournament.members.some(
						(member) => member.userId.toString() === req.user.id
					)
				)
			)
				return res.status(400).json({
					value: "userId",
					msg: "User is already registered in a team",
					param: "userId",
					location: "JWT",
				})
			const newTeam = {
				name: req.body.name,
				members: [{ role: teamRoleLeader, userId: req.user.id }],
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

router.get(
	"/:tournamentId",
	checkJWT(),
	[param("tournamentId").custom(checkTournamentExists)],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			const ruleset = await Ruleset.findById(tournament.ruleset).lean()

			// Get the team the user is a part of, if it exists
			const userTeam = tournament.teams.find((team) =>
				team.members.some((member) => member.userId.toString() === req.user.id)
			)
			// Check if the team the user is a part of can play in the tournament
			if (userTeam) {
				userTeam.teamStatus =
					userTeam.members.length <= ruleset.maxNumberOfPlayersPerTeam &&
					userTeam.members.length >= ruleset.minNumberOfPlayersPerTeam
						? teamStatusOk
						: teamStatusNotOk
			}
			return res.status(200).json({
				name: tournament.name,
				id: tournament._id,
				startsOn: tournament.startsOn,
				endsOn: tournament.endsOn,
				ruleset: {
					name: ruleset.name,
					id: ruleset._id,
					description: ruleset.description,
					maxNumberOfPlayersPerTeam: ruleset.maxNumberOfPlayersPerTeam,
					minNumberOfPlayersPerTeam: ruleset.minNumberOfPlayersPerTeam,
				},
				type: tournament.type,
				// Remove the team the user is a part of, if present
				teams: tournament.teams
					.filter(
						(team) =>
							!team.members.some(
								(member) => member.userId.toString() === req.user.id
							)
					)
					.map((team) => {
						return {
							...team,
							teamStatus:
								team.members.length <= ruleset.maxNumberOfPlayersPerTeam &&
								team.members.length >= ruleset.minNumberOfPlayersPerTeam
									? teamStatusOk
									: teamStatusNotOk,
						}
					}),
				userTeam,
				imgUrl: tournament.imgUrl,
				game: tournament.game,
			})
		} catch (e) {
			next(e)
		}
	}
)

router.post(
	"/:tournamentId/teams/:teamId/invites",
	checkJWT(),
	[
		param("tournamentId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(checkTournamentExists)
			.bail(),
		param("teamId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(checkTeamExists),
		body("userId").bail().custom(userExistsById),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			if (req.body.userId.toUpperCase() === req.user.id.toUpperCase())
				return res
					.status(422)
					.json({ errorMessage: "The user tried to invite himself" })

			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			const { teams } = tournament

			const userTeam = teams.find(
				(team) => team._id.toString() === req.params.teamId.toString()
			)

			// Check that the user is in the team and is a leader
			if (
				!userTeam.members.some(
					(member) =>
						member.userId.toString() === req.user.id &&
						member.role === teamRoleLeader
				)
			) {
				return res
					.status(403)
					.json({ errorMessage: "The user is not a leader of this team" })
			}

			await Invite.create({
				userId: req.body.userId,
				tournamentId: tournament._id.toString(),
				teamId: userTeam._id.toString(),
			})

			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
