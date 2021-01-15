const { userPermissionTournament, 
	userStatusVerified, userStatusNotVerified, 
	userStatusBanned, } = require("../models/user/consts")
const { checkUniqueUsername, userExistsById,checkUserEmailInUse } = require("../models/user/utils")
const {
	teamRoleLeader,
	teamSubmittedMatchResultWin,
	teamSubmittedMatchResultLoss,
} = require("../models/tournament/consts")
const { body, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkTournamentExists,
	checkTeamExists,
	checkMatchExists,
} = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { calculateMatchStatus } = require("../models/tournament/utils")
const eloRank = require("elo-rank")
const { matchStatusTie } = require("../models/tournament/consts")
const { ladderType } = require("../models/tournament/consts")
const { matchStatusTeamOne } = require("../models/tournament/consts")
const { matchStatusTeamTwo } = require("../models/tournament/consts")
const _ = require("lodash")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const Tournament = mongoose.model("Tournaments")
const Tickets = mongoose.model("Tickets")
const User = mongoose.model("Users")

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
			const userOnDB = await User.findOne({ email }).lean()

			// If the password is wrong
			if (!bcrypt.compareSync(password, userOnDB.password))
				return res.status(400).json({ error: "Password does not match" })

			if (userOnDB.status === userStatusBanned)
				return res.status(400).json({ error: "User is banned" })

            if(userOnDB.permissions.length === 0)
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
	"tournaments/:tournamentId/matches/:matchId",
	checkJWT(userPermissionTournament),
	[
		param("tournamentId").custom(checkTournamentExists).bail(),
		param("matchId").custom(checkMatchExists).bail(),
		body("winningTeamId")
			.custom(checkTeamExists)
			.bail(),
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

			//TODO: Fix race 
			if (match.teamOne.toString() === req.body.winningTeamId){
                match.teamOneResult = teamSubmittedMatchResultWin;
                match.teamTwoResult = teamSubmittedMatchResultLoss
			}
			else if (match.teamTwo.toString() === req.body.winningTeamId){
                match.teamOneResult = teamSubmittedMatchResultLoss;
                match.teamTwoResult = teamSubmittedMatchResultWin;
            }else{
                return res.status(404).json({
                errorMessage: "This team isn't in this match",
                })
            }

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
								teamTwo.points += 1
								break
							case matchStatusTeamOne:
								teamOne.points += 3
								break
							case matchStatusTeamTwo:
								teamTwo.points += 3
								break
						}
					}
				}else{
					// Disputa
					const teamOneMembers =  await tournament.teams.find((team) => team._id.toString() === match.teamOne.toString()).members
					const teamTwoMembers =  await tournament.teams.find((team) => team._id.toString() === match.teamTwo.toString()).members

					const teamOneLeader = await teamOneMembers.find((member) => member.role === teamRoleLeader).userId
					const teamTwoLeader = await teamTwoMembers.find((member) => member.role === teamRoleLeader).userId
					await Tickets.create({
						subject: `Disputa match`,
						date: new Date(),
						tournamentId: req.params.tournamentId,
						matchId: req.params.matchId,
						category: 'DISPUTE',
						userId: teamOneLeader,
						userIdTwo: teamTwoLeader,
						messages: [],
						status: "NEW",
					})
				}
			}

			await Tournament.replaceOne({ _id: tournament._id }, tournament)
			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

// Users patch
router.patch(
	"users/:userId",
	checkJWT(),
	// TODO: Don't replace platforms but just update the usernames
	[
		param("userId").custom(userExistsById).bail(),
		body("username")
			.optional()
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueUsername),
		body("platforms.*._id").isMongoId(),
		body("platforms.*.username").isString().trim().escape(),
		body("isVerified").bail(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const updateObj = {}

			if (req.body.username) updateObj.username = req.body.username;

			if (req.body.platforms) updateObj.platforms = req.body.platforms

			if (req.body.isVerified) updateObj.status = req.body.isVerified ? userStatusVerified : userStatusNotVerified

			await Users.updateOne({ _id: req.params.userId }, { $set: updateObj })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)


// Tickets
router.get("/tickets", checkJWT(), checkValidation, async (req, res, next) => {
	try {
			const tickets = await Tickets.find({}).lean()

			return res.status(200).json(tickets)
	} catch (e) {
		next(e)
	}
})

module.exports = router