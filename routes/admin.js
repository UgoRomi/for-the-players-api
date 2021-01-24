const {
	userPermissionTournament,
	userStatusBanned,
} = require("../models/user/consts")
const { userExistsById, checkUserEmailInUse } = require("../models/user/utils")
const {
	teamSubmittedMatchResultWin,
	teamSubmittedMatchResultLoss,
} = require("../models/tournament/consts")
const { body, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const { checkTournamentExists } = require("../models/tournament/utils")
const { checkTeamExists } = require("../models/team/utils")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")
const { calculateMatchStatus } = require("../models/tournament/utils")
const eloRank = require("elo-rank")
const { matchStatusTie } = require("../models/tournament/consts")
const { ladderType } = require("../models/tournament/consts")
const { matchStatusTeamOne } = require("../models/tournament/consts")
const { matchStatusTeamTwo } = require("../models/tournament/consts")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { disputeTicketDefaultSubject } = require("../models/ticket/consts")
const { matchStatusDispute } = require("../models/tournament/consts")
const { checkMatchExists } = require("../models/match/utils")
const { ticketCategoryDispute } = require("../models/ticket/consts")
const { ticketStatusNew } = require("../models/ticket/consts")

const Tournaments = mongoose.model("Tournaments")
const Tickets = mongoose.model("Tickets")
const Users = mongoose.model("Users")
const Matches = mongoose.model("Matches")
const Teams = mongoose.model("Teams")

const elo = new eloRank()

// Login from admin panel
router.post(
	"/login",
	[
		body("email")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.isEmail()
			.normalizeEmail()
			.custom(checkUserEmailInUse),
		body("password").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { email, password } = req.body
			const userOnDB = await Users.findOne({ email }).lean()

			// If the password is wrong
			if (!bcrypt.compareSync(password, userOnDB.password))
				return res.status(400).json({ error: "Password does not match" })

			if (userOnDB.status === userStatusBanned)
				return res.status(400).json({ error: "User is banned" })

			if (userOnDB.permissions.length === 0)
				return res.status(400).json({ error: "User is not an admin" })

			const token = jwt.sign(
				{
					email,
					id: userOnDB._id,
				},
				process.env.JWT_SECRET
			)
			return res.json({ token, status: userOnDB.status })
		} catch (e) {
			next(e)
		}
	}
)

// Tournament's match
router.patch(
	"/tournaments/:tournamentId/matches/:matchId",
	checkJWT(userPermissionTournament),
	[
		param("tournamentId")
			.isMongoId()
			.bail()
			.custom(checkTournamentExists)
			.bail(),
		param("matchId").isMongoId().bail().custom(checkMatchExists).bail(),
		body("winningTeamId").isMongoId().bail().custom(checkTeamExists).bail(),
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

			if (
				![match.teamOne.toString(), match.teamTwo.toString()].includes(
					req.body.winningTeamId
				)
			)
				return res.status(404).json({
					errorMessage: "This team isn't in this match",
				})

			const teamOneWon = match.teamOne.toString() === req.body.winningTeamId
			match.teamOneResult = teamOneWon
				? teamSubmittedMatchResultWin
				: teamSubmittedMatchResultLoss
			match.teamTwoResult = teamOneWon
				? teamSubmittedMatchResultLoss
				: teamSubmittedMatchResultWin

			const matchesStatus = await calculateMatchStatus([match], teams)
			const matchStatus = matchesStatus[0].status
			await Matches.replaceOne({ _id: match._id.toString() }, match)

			// Only update elo or points if both teams have posted results and there's no dispute
			if (matchStatus === matchStatusDispute) {
				// Dispute
				await Tickets.create({
					subject: disputeTicketDefaultSubject,
					date: new Date(),
					tournamentId: req.params.tournamentId,
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
					await Teams.updateOne(
						{ _id: teamOne.toString() },
						{ elo: teamOneNewElo }
					)

					// Update teamTwo
					const teamTwoNewElo = elo.updateRating(
						expectedScoreTeamTwo,
						+(matchStatus === matchStatusTeamTwo),
						teamTwo.elo
					)
					await Teams.updateOne(
						{ _id: teamTwo.toString() },
						{ elo: teamTwoNewElo }
					)
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
					await Teams.updateOne(
						{ _id: teamOne.toString() },
						{ points: teamOnePoints }
					)
					await Teams.updateOne(
						{ _id: teamTwo.toString() },
						{ points: teamTwoPoints }
					)
				}
			}

			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

// Users patch
router.patch(
	"/users/:userId",
	checkJWT(),
	// TODO: Don't replace platforms but just update the usernames
	[
		param("userId")
			.custom(userExistsById)
			.customSanitizer(convertToMongoId)
			.bail(),
		body("status"),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const updateObj = {}
			if (req.body.status) updateObj.status = req.body.status
			await Users.updateOne({ _id: req.params.userId }, { $set: updateObj })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

// Tickets
router.get("/tickets", checkJWT(), async (req, res, next) => {
	try {
		const tickets = await Tickets.find({}).lean()

		return res.status(200).json(tickets)
	} catch (e) {
		next(e)
	}
})

module.exports = router
