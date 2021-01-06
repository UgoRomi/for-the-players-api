const { userPermissionTournament } = require("../models/user/consts")
const {
	userExistsById,
	multipleUsersExistById,
} = require("../models/user/utils")
const {
	types,
	teamRoleLeader,
	teamStatusNotOk,
	teamStatusOk,
	updateMatchActions,
	teamSubmittedResults,
} = require("../models/tournament/consts")
const { teamInvitePending } = require("../models/invite/consts")
const { body, query, param } = require("express-validator")
const { convertToMongoId, toISO } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkUniqueName,
	checkTeamNameInTournament,
	checkTournamentExists,
	checkTeamExists,
	userNotInATeam,
	userIsLeader,
	checkTeamHasOngoingMatches,
	checkUserIsLeaderInTeam,
	checkMatchExists,
	userIsLeaderMiddleware,
} = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { calculateMatchStatus } = require("../models/tournament/utils")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const { checkImgInput } = require("../utils/helpers")
const { checkIfRulesetExists } = require("../models/ruleset/utils")
const { checkIfPlatformExists } = require("../models/platform/utils")
const { checkIfGameExists } = require("../models/game/utils")
const { formatISO } = require("date-fns")
const eloRank = require("elo-rank")
const { checkTournamentHasNotStarted } = require("../models/tournament/utils")
const { matchStatusTie } = require("../models/tournament/consts")
const { ladderType } = require("../models/tournament/consts")
const { matchStatusTeamOne } = require("../models/tournament/consts")
const { matchStatusTeamTwo } = require("../models/tournament/consts")
const _ = require("lodash")
const { calculateTeamResults } = require("../models/tournament/utils")

const Tournament = mongoose.model("Tournaments")
const Ruleset = mongoose.model("Rulesets")
const Game = mongoose.model("Games")
const Invite = mongoose.model("Invites")
const Users = mongoose.model("Users")

const elo = new eloRank()

router.post(
	"/",
	checkJWT(userPermissionTournament),
	[
		body("name")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueName),
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
		body("open").isBoolean(),
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
				open,
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
				open,
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
						ruleset: rulesetDoc?.name,
						type,
						numberOfTeams: tournament.teams.length,
						imgUrl,
						game: gameDoc.name,
						open: tournament.open,
					}
				})
			)
			return res.json(result)
		} catch (e) {
			next(e)
		}
	}
)

/*
	Register a new team to the tournament
 */
router.post(
	"/:tournamentId/teams",
	checkJWT(),
	[
		param("tournamentId")
			.custom(checkTournamentExists)
			.bail()
			.custom(checkTournamentHasNotStarted)
			.bail(),
		body("name")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkTeamNameInTournament),
		body("imgUrl").optional().isURL(),
		body("imgBase64").isBase64().custom(checkIfValidaImageData),
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

			const imageURL = await checkImgInput(req.body)

			const newTeam = {
				name: req.body.name,
				members: [{ role: teamRoleLeader, userId: req.user.id }],
				imgUrl: imageURL,
				imgBase64: req.body.imgBase64,
			}
			if (tournament.type === ladderType) newTeam.elo = 1500
			else newTeam.points = 0
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

			const ruleset = await Promise.all(
				tournament.ruleset.map(async (ruleset) => {
					return await Ruleset.findById(ruleset).lean()
				})
			)

			// Add "status" to the matches
			const matches = await calculateMatchStatus(
				tournament.matches,
				tournament.teams
			)

			// Count wins, losses and ties for each team
			let teams = await calculateTeamResults(matches, tournament.teams)

			//TODO: It does a shit ton of queries
			teams = await Promise.all(
				teams.map(async (team) => {
					team.members = await Promise.all(
						team.members.map(async (member) => {
							const user = await Users.findById(
								member.userId.toString(),
								"username"
							).lean()
							return {
								...member,
								username: user.username,
							}
						})
					)
					return team
				})
			)

			// Get the team the user is a part of, if it exists
			const userTeam = teams.find((team) =>
				team.members.some((member) => member.userId.toString() === req.user.id)
			)
			// Check if the team the user is a part of can play in the tournament
			if (userTeam) {
				userTeam.members = await Promise.all(
					userTeam.members.map(async (member) => {
						const user = await Users.findById(member.userId, "username").lean()
						return {
							...member,
							username: user.username,
						}
					})
				)
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
				teams: teams,
				userTeam,
				imgUrl: tournament.imgUrl,
				game: tournament.game,
				matches,
				open: tournament.open,
			})
		} catch (e) {
			next(e)
		}
	}
)

router.patch(
	"/:tournamentId/teams/:teamId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("teamId").custom(checkTeamExists),
		body("name").optional().custom(checkTeamNameInTournament).trim().escape(),
		body("membersToRemove").optional().custom(multipleUsersExistById),
		body("imgUrl").optional().isURL(),
		body("imgBase64").isBase64().custom(checkIfValidaImageData),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			if (!req.body.name && !req.body.membersToRemove)
				return res.status(200).json()

			if (
				!(await userIsLeader(
					req.params.teamId,
					req.params.tournamentId,
					req.user.id
				))
			)
				return res.status(403).json({
					errorMessage: "You need to be a leader to update a team's details",
				})

			const imageURL = await checkImgInput(req.body)
			const updateObject = { $set: {} }

			if (imageURL) updateObject.$set["teams.$.imgUrl"] = req.body.imgUrl
			if (req.body.name) updateObject.$set["teams.$.name"] = req.body.name
			if (req.body.membersToRemove)
				if (req.body.membersToRemove.length === 1) {
					updateObject.$pull = {
						"teams.$.members": { userId: req.body.membersToRemove },
					}
				} else {
					updateObject.$pullAll = {
						"teams.$.members": { userId: req.body.membersToRemove },
					}
				}

			await Tournament.findOneAndUpdate(
				{
					"_id": req.params.tournamentId,
					"teams._id": req.params.teamId,
				},
				updateObject
			)

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

router.delete(
	"/:tournamentId/teams/:teamId",
	checkJWT(),
	[
		param("tournamentId")
			.custom(checkTournamentExists)
			.bail()
			.custom(checkTournamentHasNotStarted)
			.bail(),
		param("teamId").custom(checkTeamExists),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			if (
				!(await userIsLeader(
					req.params.teamId,
					req.params.tournamentId,
					req.user.id
				))
			)
				return res.status(403).json({
					errorMessage: "You need to be a leader to delete a team",
				})

			await Tournament.findOneAndUpdate(
				{ _id: req.params.tournamentId },
				{ $pull: { teams: { _id: req.params.teamId } } }
			)

			return res.status(200).json()
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
		body("userId").bail().custom(userExistsById).custom(userNotInATeam),
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

			// Check if invited user already has an invite pending
			if (
				await Invite.findOne({
					userId: req.body.userId,
					teamId: userTeam._id.toString(),
					status: teamInvitePending,
				}).lean()
			)
				return res
					.status(403)
					.json({ errorMessage: "The user has already been invited" })
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

router.post(
	"/:tournamentId/matches",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		body("teamId")
			.custom(checkTeamExists)
			.bail()
			.custom(checkUserIsLeaderInTeam)
			.custom(checkTeamHasOngoingMatches),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			const { matches } = tournament

			// TODO: Fix race condition
			if (matches.some((match) => !match.teamTwo)) {
				const matchToUpdate = matches.find((match) => !match.teamTwo)
				matchToUpdate.teamTwo = req.body.teamId
				matchToUpdate.acceptedAt = formatISO(Date.now())
				tournament.matches = await Promise.all(
					matches.map(async (match) => {
						if (match._id === matchToUpdate._id) {
							const ruleset = await Ruleset.findById(
								tournament.ruleset,
								"bestOf maps"
							).lean()
							matchToUpdate.maps = _.sampleSize(ruleset.maps, ruleset.bestOf)
							return matchToUpdate
						}
						return match
					})
				)
				await Tournament.replaceOne({ _id: tournament._id }, tournament)
				return res.status(200).json({ matchId: matchToUpdate._id.toString() })
			}

			const newMatch = {
				teamOne: req.body.teamId,
				acceptedAt: formatISO(Date.now()),
			}
			await Tournament.updateOne(
				{ _id: req.params.tournamentId },
				{ $push: { matches: newMatch } }
			)
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.delete(
	"/:tournamentId/matches/:matchId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("matchId").custom(checkMatchExists),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()

			const match = tournament.matches.find(
				(match) => match._id.toString() === req.params.matchId
			)

			if (match.teamTwo)
				return res.status(403).json({
					errorMessage: "Match already accepted",
				})

			if (
				!(await userIsLeader(
					match.teamOne._id.toString(),
					req.params.tournamentId,
					req.user.id
				))
			)
				return res.status(403).json({
					errorMessage: "You need to be a leader to delete a match",
				})

			await Tournament.findOneAndUpdate(
				{ _id: req.params.tournamentId },
				{ $pull: { matches: { _id: req.params.matchId } } }
			)

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

router.patch(
	"/:tournamentId/matches/:matchId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("matchId").custom(checkMatchExists).bail(),
		body("teamId")
			.custom(checkTeamExists)
			.custom(userIsLeaderMiddleware)
			.bail(),
		body("action").isIn(updateMatchActions),
		body("result").isIn(teamSubmittedResults),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			const match = tournament.matches.find(
				(match) => match._id.toString() === req.params.matchId
			)

			//TODO: Fix race condition
			if (match.teamOne.toString() === req.body.teamId)
				match.teamOneResult = req.body.result
			else if (match.teamTwo.toString() === req.body.teamId)
				match.teamTwoResult = req.body.result
			else
				return res.status(404).json({
					errorMessage: "This team isn't in this match",
				})

			if (match.teamOneResult && match.teamTwoResult) {
				const matchesStatus = await calculateMatchStatus(
					[match],
					tournament.teams
				)
				const matchStatus = matchesStatus[0].status

				// Only update elo or points if both teams have posted results and there's no dispute
				if (
					matchStatus === matchStatusTeamOne ||
					matchStatus === matchStatusTeamTwo ||
					matchStatus === matchStatusTie
				) {
					const teams = tournament.teams.filter(
						(team) =>
							team._id.toString() === match.teamOne.toString() ||
							team._id.toString() === match.teamTwo.toString()
					)
					const teamOne = teams.find(
						(team) => team._id.toString() === match.teamOne.toString()
					)
					const teamTwo = teams.find(
						(team) => team._id.toString() === match.teamTwo.toString()
					)
					// Elo doesn't update in case of a tie
					if (
						tournament.type === ladderType &&
						matchStatus !== matchStatusTie
					) {
						const expectedScoreTeamOne = elo.getExpected(
							teamOne.elo,
							teamTwo.elo
						)
						const expectedScoreTeamTwo = elo.getExpected(
							teamTwo.elo,
							teamOne.elo
						)

						// +true equals 1
						// +false equals 0
						teamOne.elo = elo.updateRating(
							expectedScoreTeamOne,
							+(matchStatus === matchStatusTeamOne),
							teamOne.elo
						)
						teamTwo.elo = elo.updateRating(
							expectedScoreTeamTwo,
							+(matchStatus === matchStatusTeamTwo),
							teamTwo.elo
						)
					} else {
						switch (matchStatus) {
							case matchStatusTie:
								teamOne.points += 1
								teamOne.points += 1
								break
							case matchStatusTeamOne:
								teamOne.points += 3
								break
							case matchStatusTeamTwo:
								teamTwo.points += 3
								break
						}
					}
				}
			}

			await Tournament.replaceOne({ _id: tournament._id }, tournament)
			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

router.get(
	"/:tournamentId/matches",
	checkJWT(),
	[param("tournamentId").custom(checkTournamentExists).bail()],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()

			const matches = await calculateMatchStatus(
				tournament.matches,
				tournament.teams
			)

			return res.status(200).json(matches)
		} catch (e) {
			next(e)
		}
	}
)

router.get(
	"/:tournamentId/matches/:matchId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("matchId").custom(checkMatchExists).bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()
			const match = tournament.matches.find(
				(match) => match._id.toString() === req.params.matchId
			)

			const newMatch = await calculateMatchStatus([match], tournament.teams)

			return res.status(200).json(newMatch[0])
		} catch (e) {
			next(e)
		}
	}
)

router.get(
	"/:tournamentId/teams/:teamId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("teamId").custom(checkTeamExists).bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const tournament = await Tournament.findById(
				req.params.tournamentId
			).lean()

			const ruleset = await Ruleset.findById(
				tournament.ruleset,
				"maxNumberOfPlayersPerTeam minNumberOfPlayersPerTeam"
			).lean()

			// Add "status" to the matches
			const matches = await calculateMatchStatus(
				tournament.matches,
				tournament.teams
			)

			// Count wins, losses and ties for each team
			const team = await calculateTeamResults(matches, [
				tournament.teams.find(
					(team) => team._id.toString() === req.params.teamId
				),
			])[0]

			team.members = await Promise.all(
				team.members.map(async (member) => {
					const user = await Users.findById(
						member.userId.toString(),
						"username"
					).lean()
					return {
						...member,
						username: user.username,
					}
				})
			)

			return res.status(200).json({
				name: team.name,
				members: team.members,
				invites: team.invites,
				status:
					team.members.length <= ruleset.maxNumberOfPlayersPerTeam &&
					team.members.length >= ruleset.minNumberOfPlayersPerTeam
						? teamStatusOk
						: teamStatusNotOk,
				wins: team.wins,
				ties: team.ties,
				losses: team.losses,
				imgUrl: team.imgUrl,
			})
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
