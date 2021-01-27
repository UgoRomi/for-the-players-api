const {
	userExistsById,
	multipleUsersExistById,
} = require("../models/user/utils")
const { types, updateMatchActions } = require("../models/tournament/consts")
const { teamRoleLeader } = require("../models/team/consts")
const { teamSubmittedResults } = require("../models/match/consts")
const { teamInvitePending } = require("../models/invite/consts")
const { body, query, param } = require("express-validator")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkTournamentExists,
} = require("../models/tournament/utils")
const { checkTeamHasOngoingMatches } = require("../models/match/utils")
const {
	checkTeamNameInTournament,
	checkTeamExists,
	checkUserIsLeaderInTeam,
	userNotInATeam,
	userIsLeader,
	userIsLeaderMiddleware,
} = require("../models/team/utils")
const mongoose = require("mongoose")
const { calculateMatchStatus } = require("../models/tournament/utils")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const { checkImgInput } = require("../utils/helpers")
const { checkIfGameExists } = require("../models/game/utils")
const { formatISO } = require("date-fns")
const eloRank = require("elo-rank")
const { checkTournamentHasNotStarted } = require("../models/tournament/utils")
const { matchStatusTie } = require("../models/tournament/consts")
const { ladderType } = require("../models/tournament/consts")
const { matchStatusTeamOne } = require("../models/tournament/consts")
const { matchStatusTeamTwo } = require("../models/tournament/consts")
const _ = require("lodash")
const { disputeTicketDefaultSubject } = require("../models/ticket/consts")
const { matchStatusDispute } = require("../models/tournament/consts")
const { ticketStatusNew } = require("../models/ticket/consts")
const { ticketCategoryDispute } = require("../models/ticket/consts")
const { checkMatchExists } = require("../models/match/utils")
const { teamRoleMember } = require("../models/team/consts")
const { calculateTeamResults } = require("../models/tournament/utils")

const Tournaments = mongoose.model("Tournaments")
const Rulesets = mongoose.model("Rulesets")
const Games = mongoose.model("Games")
const Invites = mongoose.model("Invites")
const Users = mongoose.model("Users")
const Tickets = mongoose.model("Tickets")
const Matches = mongoose.model("Matches")
const Teams = mongoose.model("Teams")

const elo = new eloRank()

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

			const tournaments = await Tournaments.find(findQuery).lean()
			const result = await Promise.all(
				tournaments.map(async (tournament) => {
					const { name, startsOn, endsOn, type, imgUrl } = tournament

					const teams = await Teams.find({
						tournamentId: tournament._id.toString(),
					}).lean()
					const rulesets = await Promise.all(
						tournament.rulesets.map(async (ruleset) => {
							return await Rulesets.findById(ruleset, "_id").lean()
						})
					)
					const gameDoc = await Games.findById(
						tournament.game.toString()
					).lean()
					return {
						name,
						_id: tournament._id,
						startsOn,
						endsOn,
						rulesets: rulesets.map((ruleset) => ruleset._id),
						type,
						numberOfTeams: teams.length,
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
			const tournament = await Tournaments.findById(
				req.params.tournamentId
			).lean()
			if (
				await Teams.findOne({
					tournamentId: req.params.tournamentId,
					members: { userId: req.user.id },
				}).lean()
			)
				return res.status(400).json({
					value: "userId",
					msg: "User is already registered in a team",
					param: "userId",
					location: "JWT",
				})

			const imageURL = await checkImgInput(req.body)
			const newTeam = {
				tournamentId: req.params.tournamentId,
				name: req.body.name,
				members: [
					{
						role: teamRoleLeader,
						userId: req.user.id,
						dateJoined: Date().toLocaleString("en-US", {
							timeZone: "Europe/Rome",
						}),
					},
				],
				imgUrl: imageURL,
				imgBase64: req.body.imgBase64,
			}
			if (tournament.type === ladderType) newTeam.elo = 1500
			else newTeam.points = 0
			await Teams.create(newTeam)
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
			const tournament = await Tournaments.findById(
				req.params.tournamentId
			).lean()
			const matches = await Matches.find({
				tournamentId: req.params.tournamentId,
			}).lean()
			const teams = await Teams.find(
				{
					tournamentId: req.params.tournamentId,
				},
				"-tournamentId "
			).lean()

			const rulesets = await Rulesets.find(
				{ _id: { $in: tournament.rulesets } },
				"_id maps maxNumberOfPlayersPerTeam minNumberOfPlayersPerTeam description name bestOf"
			).lean()

			// Add "status" to the matches
			const calculatedMatches = await calculateMatchStatus(matches, teams)

			// Count wins, losses and ties for each team
			let calculatedTeams = await calculateTeamResults(calculatedMatches, teams)

			//TODO: It does a shit ton of queries
			calculatedTeams = await Promise.all(
				calculatedTeams.map(async (team) => {
					team.members = await Promise.all(
						team.members.map(async (member) => {
							const user = await Users.findById(
								member.userId.toString(),
								"username"
							).lean()
							if (user){

							return {
								...member,
								username: user.username,
							}
							}else{
								return {
									...member
								}
							}
						})
					)
					return team
				})
			)

			// Get the team the user is a part of, if it exists
			const userTeam = calculatedTeams.find((team) =>
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
			}
			return res.status(200).json({
				name: tournament.name,
				_id: tournament._id,
				startsOn: tournament.startsOn,
				endsOn: tournament.endsOn,
				rulesets,
				type: tournament.type,
				// Remove the team the user is a part of, if present
				teams: calculatedTeams,
				userTeam,
				imgUrl: tournament.imgUrl,
				game: tournament.game,
				matches: calculatedMatches,
				open: tournament.open,
				minTeamSizePerMatch: tournament.minTeamSizePerMatch,
				maxTeamSizePerMatch: tournament.maxTeamSizePerMatch,
				rules: tournament.rules,
			})
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Update a single team
 */
router.patch(
	"/:tournamentId/teams/:teamId",
	checkJWT(),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("teamId").custom(checkTeamExists),
		body("name").optional().custom(checkTeamNameInTournament).trim().escape(),
		body("membersToRemove").optional().custom(multipleUsersExistById),
		body("imgUrl").optional().isURL(),
		body("imgBase64").optional().isBase64(),
		body("newLeader").optional().isMongoId(),
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
					errorMessage: "You need to be a leader to update a team's details",
				})

			// TODO: Fix race condition
			const teamToUpdate = await Teams.findById(req.params.teamId).lean()
			// Update team image
			if (req.body.imgBase64 || req.body.imgUrl)
				teamToUpdate.imgUrl = await checkImgInput(req.body)
			// Update team name
			if (req.body.name) teamToUpdate.name = req.body.name
			// Remove members
			if (req.body.membersToRemove)
				_.remove(teamToUpdate.members, (member) =>
					req.body.membersToRemove.includes(member.userId.toString())
				)
			// Update leader
			if (req.body.newLeader) {
				teamToUpdate.members = teamToUpdate.members.map((member) => {
					// Set the role to LEADER for the new leader
					if (member.userId.toString() === req.body.newLeader) {
						member.role = teamRoleLeader
						return member
					}
					// Remove old leader
					if (member.role !== teamRoleLeader) return member
					// Leave everyone else the same
					member.role = teamRoleMember
					return member
				})
			}

			await Teams.updateOne(
				{
					_id: req.params.teamId,
				},
				teamToUpdate
			)

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Remove a team from a tournament
 */
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

			await Teams.deleteOne({ _id: req.params.teamId })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Invite a user to a team
 */
router.post(
	"/:tournamentId/teams/:teamId/invites",
	checkJWT(),
	[
		param("tournamentId")
			.isMongoId()
			.bail()
			.custom(checkTournamentExists)
			.bail(),
		param("teamId").isMongoId().bail().custom(checkTeamExists),
		body("userId").isMongoId().custom(userExistsById).custom(userNotInATeam),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			if (req.body.userId.toUpperCase() === req.user.id.toUpperCase())
				return res
					.status(422)
					.json({ errorMessage: "The user tried to invite himself" })

			const userTeam = await Teams.findById(req.params.teamId, "members").lean()

			// Check that the user is in the team and is a leader
			if (
				!(await userIsLeader(
					userTeam._id,
					req.params.tournamentId,
					req.user.id
				))
			) {
				return res
					.status(403)
					.json({ errorMessage: "The user is not a leader of this team" })
			}

			// Check if invited user already has an invite pending
			if (
				await Invites.findOne({
					userId: req.body.userId,
					teamId: userTeam._id.toString(),
					status: teamInvitePending,
				}).lean()
			)
				return res
					.status(403)
					.json({ errorMessage: "The user has already been invited" })
			await Invites.create({
				userId: req.body.userId,
				tournamentId: req.params.tournamentId,
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
		body("rulesetId").isString().bail(),
		body("numberOfPlayers").isInt().bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const matches = await Matches.find({
				tournamentId: req.params.tournamentId,
			}).lean()

			// TODO: Fix race condition
			if (
				matches.some(
					(match) =>
						!match.teamTwo &&
						match.numberOfPlayers === parseInt(req.body.numberOfPlayers) &&
						match.rulesetId.toString() === req.body.rulesetId
				)
			) {
				const matchToUpdate = matches.find(
					(match) =>
						!match.teamTwo &&
						match.numberOfPlayers === parseInt(req.body.numberOfPlayers) &&
						match.rulesetId.toString() === req.body.rulesetId
				)
				matchToUpdate.teamTwo = req.body.teamId
				matchToUpdate.acceptedAt = Date().toLocaleString("en-US", {
					timeZone: "Europe/Rome",
				})
				const ruleset = await Rulesets.findById(
					req.body.rulesetId,
					"bestOf maps"
				).lean()
				matchToUpdate.maps = _.sampleSize(ruleset.maps, ruleset.bestOf)
				await Matches.replaceOne({ _id: matchToUpdate._id }, matchToUpdate)
				return res.status(200).json({ matchId: matchToUpdate._id.toString() })
			}

			await Matches.create({
				tournamentId: req.params.tournamentId,
				teamOne: req.body.teamId,
				acceptedAt: Date().toLocaleString("en-US", {
					timeZone: "Europe/Rome",
				}),
				numberOfPlayers: req.body.numberOfPlayers,
				rulesetId: req.body.rulesetId,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.delete(
	"/:tournamentId/matches/:matchId",
	checkJWT(),
	[param("matchId").custom(checkMatchExists)],
	checkValidation,
	async (req, res, next) => {
		try {
			const match = await Matches.findById(req.params.matchId).lean()

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

			await Matches.deleteOne({ _id: req.params.matchId })
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
			const tournament = await Tournaments.findById(
				req.params.tournamentId,
				"type"
			).lean()
			const match = await Matches.findById(req.params.matchId).lean()
			const teamOne = await Teams.findById(match.teamOne.toString()).lean()
			const teamTwo = await Teams.findById(match.teamTwo.toString()).lean()
			const teams = [teamOne, teamTwo]

			//TODO: Fix race
			if (match.teamOne.toString() === req.body.teamId)
				match.teamOneResult = req.body.result
			else if (match.teamTwo.toString() === req.body.teamId)
				match.teamTwoResult = req.body.result
			else
				return res.status(404).json({
					errorMessage: "This team isn't in this match",
				})

			await Matches.replaceOne({ _id: match._id }, match)
			// If only one team posted the result just return
			if (!match.teamOneResult || !match.teamTwoResult)
				return res.status(200).json({})

			// If both teams posted the result check if it's not a dispute and update points/elo accordingly
			const matchesStatus = await calculateMatchStatus([match], teams)
			const matchStatus = matchesStatus[0].status

			// Only update elo or points if both teams have posted results and there's no dispute
			if (matchStatus === matchStatusDispute) {
				// Dispute
				await Tickets.create({
					subject: disputeTicketDefaultSubject,
					date: new Date(),
					tournamentId: req.params.tournamentId,
					teamOne: teamOne._id,
					teamTwo: teamTwo._id,
					matchId: req.params.matchId,
					category: ticketCategoryDispute,
					messages: [],
					status: ticketStatusNew,
				})
			} else {
				// Elo doesn't update in case of a tie
				if (tournament.type === ladderType && matchStatus !== matchStatusTie) {
					// UPDATE ELO
					const expectedScoreTeamOne = elo.getExpected(teamOne.elo, teamTwo.elo)
					const expectedScoreTeamTwo = elo.getExpected(teamTwo.elo, teamOne.elo)

					// +true equals 1
					// +false equals 0
					// Update teamOne
					const teamOneNewElo = elo.updateRating(
						expectedScoreTeamOne,
						+(matchStatus === matchStatusTeamOne),
						teamOne.elo
					)
					await Teams.updateOne({ _id: teamOne._id }, { elo: teamOneNewElo })

					// Update teamTwo
					const teamTwoNewElo = elo.updateRating(
						expectedScoreTeamTwo,
						+(matchStatus === matchStatusTeamTwo),
						teamTwo.elo
					)
					await Teams.updateOne({ _id: teamTwo._id }, { elo: teamTwoNewElo })
				} else {
					// UPDATE POINTS
					let teamOnePoints = teamOne.points
					let teamTwoPoints = teamTwo.points
					switch (matchStatus) {
						case matchStatusTie:
							teamOnePoints += 1
							teamTwoPoints += 1
							break
						case matchStatusTeamOne:
							teamOnePoints += 3
							break
						case matchStatusTeamTwo:
							teamTwoPoints += 3
							break
					}
					await Teams.updateOne({ _id: teamOne._id }, { points: teamOnePoints })
					await Teams.updateOne({ _id: teamTwo._id }, { points: teamTwoPoints })
				}
			}

			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

router.post(
	"/:tournamentId/matches/:matchId",
	checkJWT(),
	[
		param("matchId").custom(checkMatchExists).bail(),
		body("teamId")
			.custom(checkTeamExists)
			.custom(userIsLeaderMiddleware)
			.bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const match = await Matches.findById(req.params.matchId)

			//TODO: Fix race condition
			if (match.teamTwo)
				return res.status(404).json({
					errorMessage: "The match has already been accepted",
				})
			const ruleset = await Rulesets.findById(
				match.rulesetId.toString(),
				"bestOf maps"
			).lean()
			const maps = _.sampleSize(ruleset.maps, ruleset.bestOf)

			await Matches.updateOne(
				{ _id: req.params.matchId },
				{ teamTwo: req.body.teamId, acceptedAt: formatISO(Date.now()), maps }
			)
			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Get all the matches in a tournament
 */
router.get(
	"/:tournamentId/matches",
	checkJWT(),
	[param("tournamentId").isMongoId().custom(checkTournamentExists)],
	checkValidation,
	async (req, res, next) => {
		try {
			const matches = await Matches.find({
				tournamentId: req.params.tournamentId,
			}).lean()
			const teams = await Teams.find({
				tournamentId: req.params.tournamentId,
			}).lean()

			const calculatedMatches = await calculateMatchStatus(matches, teams)

			return res.status(200).json(calculatedMatches)
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
			const match = await Matches.findById(req.params.matchId).lean()
			const teams = await Teams.find({
				$or: [{ _id: match.teamOne }, { _id: match.teamTwo }],
			})

			const newMatch = await calculateMatchStatus([match], teams)

			return res.status(200).json(newMatch[0])
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Get a team details
 */
router.get(
	"/:tournamentId/teams/:teamId",
	checkJWT(),
	[
		param("tournamentId")
			.isMongoId()
			.bail()
			.custom(checkTournamentExists)
			.bail(),
		param("teamId").isMongoId().bail().custom(checkTeamExists).bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const matches = await Matches.find({
				tournamentId: req.params.tournamentId,
			}).lean()
			const teams = await Teams.find({
				tournamentId: req.params.tournamentId,
			}).lean()

			// Add "status" to the matches
			const calculatedMatches = await calculateMatchStatus(matches, teams)

			// Count wins, losses and ties for each team
			const calculatedTeam = await calculateTeamResults(calculatedMatches, [
				teams.find((team) => team._id.toString() === req.params.teamId),
			])[0]

			calculatedTeam.members = await Promise.all(
				calculatedTeam.members.map(async (member) => {
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
				name: calculatedTeam.name,
				members: calculatedTeam.members,
				invites: calculatedTeam.invites,
				wins: calculatedTeam.wins,
				ties: calculatedTeam.ties,
				losses: calculatedTeam.losses,
				imgUrl: calculatedTeam.imgUrl,
			})
		} catch (e) {
			next(e)
		}
	}
)

// Bracket tournaments are identified by "bracket"
router.get(
	"/brackets",
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
			//
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
