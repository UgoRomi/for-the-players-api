const { body, param } = require("express-validator")
const { toISO } = require("../utils/custom-sanitizers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const mongoose = require("mongoose")
const { ticketStatusDeleted } = require("../models/ticket/consts")
const { ticketStatusSolved } = require("../models/ticket/consts")
const { ticketStatuses } = require("../models/ticket/consts")
const { checkIfTicketExists } = require("../models/ticket/utils")
const { userPermissionTicket } = require("../models/user/consts")
const { ticketStatusNew } = require("../models/ticket/consts")

const Tickets = mongoose.model("Tickets")
const Tournament = mongoose.model("Tournaments")
const Users = mongoose.model("Users")

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
		body("tournamentId").optional().bail(),
		body("matchId").optional().bail(),
		body("category").optional(),
		body("isAdmin").optional(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { subject, tournamentId, matchId, category } = req.body
			const messages = [
				{
					message: req.body.description,
					userId: req.user.id,
					isAdmin: req.body.isAdmin ? req.body.isAdmin : false,
				},
			]

			const user = await Users.findById(req.user.id.toString()).lean()

			await Tickets.create({
				subject,
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

router.get(
	"/:ticketId",
	checkJWT(),
	[param("ticketId").custom(checkIfTicketExists).bail()],
	checkValidation,
	async (req, res, next) => {
		try {
			if (req.user.id) {
				const tickets = await Tickets.findOne({
					_id: req.params.ticketId,
				}).lean()
				if (tickets.category === "DISPUTE") {
					if (tickets.matchId && tickets.tournamentId) {
						const tournament = await Tournament.findById(
							tickets.tournamentId.toString()
						).lean()
						const match = tournament.matches.find(
							(match) => match._id.toString() === tickets.matchId.toString()
						)
						if (match) {
							const teamOneName = tournament.teams.find(
									(team) => team._id.toString() === match.teamOne.toString()
								).name,
								teamTwoName = tournament.teams.find(
									(team) => team._id.toString() === match.teamTwo.toString()
								).name,
								acceptedDate = match.acceptedAt
							tickets.tournamentName = tournament.name
							tickets.matchObj = {
								teamOneName,
								teamTwoName,
								acceptedDate,
							}
						}
					}
				}

				tickets.messages = await Promise.all(
					tickets.messages.map(async (message) => {
						const user = await Users.findById(message.userId).lean()
						message.username = user.username

						return message
					})
				)

				return res.status(200).json(tickets)
			}
		} catch (e) {
			next(e)
		}
	}
)

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

router.post(
	["/:ticketId/messages", "/:ticketId"],
	checkJWT(),
	[
		param("ticketId").isMongoId().bail().custom(checkIfTicketExists),
		body("message").isString(),
		body("fromAdminPanel").isBoolean(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const ticket = await Tickets.findOne({
				_id: req.params.ticketId,
			}).lean()
			if (
				ticket.status === ticketStatusSolved ||
				ticket.status === ticketStatusDeleted
			) {
				return res.status(403).json({
					errorMessage: "Ticket already closed",
				})
			}

			let { message, fromAdminPanel } = req.body

			const user = await Users.findById(req.user.id).lean()
			if (!user.permissions.includes(userPermissionTicket))
				fromAdminPanel = false

			await Tickets.updateOne(
				{ _id: req.params.ticketId },
				{
					$push: {
						messages: {
							message,
							userId: req.user.id,
							fromAdminPanel,
						},
					},
				}
			)
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
