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
const mongoose = require("mongoose")
const Tickets = mongoose.model("Tickets")

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
			await Tickets.create({
				subject,
				date,
				tournamentId,
				matchId,
				category,
				userId: req.user.id,
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

module.exports = router
