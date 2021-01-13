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
	checkTournamentExists,
	checkMatchExists,
} = require("../models/tournament/utils")

const { 
	checkTicketExists
} = require("../models/ticket/utils")
const mongoose = require("mongoose")
const Tickets = mongoose.model("Tickets")
const Tournament = mongoose.model("Tournaments")

router.post(
	"/",
	checkJWT(),
	[
		body("subject")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.bail(),
		body("description")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.bail(),
		body("date")
			.notEmpty({ ignore_whitespace: true })
			.isDate()
			.customSanitizer(toISO),
		body("tournamentId").optional().bail(),
		body("matchId").optional().bail(),
		body("category").optional(),
		body("isAdmin").optional(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { subject, date, tournamentId, matchId, category } = req.body
			const messages = [
				{
					message: req.body.description,
					date: req.body.date,
					userId: req.user.id,
					isAdmin: req.body.isAdmin ? req.body.isAdmin : false,
				},
			]

			const user = await Users.findById(
				req.user.id.toString()
			).lean()

			await Tickets.create({
				subject,
				date,
				tournamentId,
				matchId,
				category,
				userId: user._id,
				messages: messages,
				status: "NEW",
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.get("/", checkJWT(), checkValidation, async (req, res, next) => {
	if (req.user.id) {
		const tickets = await Tickets.find({ $or: [ { userId: req.user.id }, { userIdTwo: req.user.id } ] }).lean()

		return res.status(200).json(tickets)
	}
})

router.get("/:ticketId", checkJWT(),[
	param("ticketId").custom(checkTicketExists).bail()
], checkValidation, async (req, res, next) => {
	if (req.user.id) {
		const tickets = await Tickets.findOne({ $or: [ { userId: req.user.id }, { userIdTwo: req.user.id } ] }).lean()

		if(tickets.category == 'DISPUTE'){
			if(tickets.matchId && tickets.tournamentId){
				const tournament = await Tournament.findById(
					tickets.tournamentId.toString()
				).lean()
				const match = tournament.matches.find(
					(match) => match._id.toString() === tickets.matchId.toString()
				)
				if(match){
					const teamOneName = tournament.teams.find(
						(team) => team._id.toString() === match.teamOne.toString()
					).name,
					teamTwoName = tournament.teams.find(
						(team) => team._id.toString() === match.teamTwo.toString()
					).name,
					acceptedDate = match.acceptedAt;
					tickets.tournamentName = tournament.name;
					tickets.matchObj = {
						teamOneName,
						teamTwoName,
						acceptedDate
					}
				}
	
			}
		}

		return res.status(200).json(tickets)
	}
})

module.exports = router
