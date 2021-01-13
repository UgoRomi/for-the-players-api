const { body, param } = require("express-validator")
const { toISO } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const {
	checkTournamentExists,
	checkMatchExists,
} = require("../models/tournament/utils")
const mongoose = require("mongoose")
const { ticketStatuses } = require("../models/ticket/consts")
const { checkIfTicketExists } = require("../models/ticket/utils")
const { userPermissionTicket } = require("../models/user/consts")
const { ticketStatusNew } = require("../models/ticket/consts")

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
				status: ticketStatusNew,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

router.get("/", checkJWT(), checkValidation, async (req, res, next) => {
	try {
		if (req.user.id) {
			const tickets = await Tickets.find({
				$or: [{ userId: req.user.id }, { userIdTwo: req.user.id }],
			}).lean()

			return res.status(200).json(tickets)
		}
	} catch (e) {
		next(e)
	}
})

router.get("/:ticketId", checkJWT(),[
	param("ticketId").custom(checkIfTicketExists).bail()
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
router.patch(
	"/:ticketId",
	checkJWT(userPermissionTicket),
	[
		param("ticketId").isMongoId().bail().custom(checkIfTicketExists),
		body("newStatus").isIn(ticketStatuses),
	],
	async (req, res, next) => {
		try {
			await Tickets.findOneAndUpdate(
				{ _id: req.params.ticketId },
				{ status: req.body.newStatus }
			)
			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
