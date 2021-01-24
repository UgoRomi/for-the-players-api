const router = require("express").Router()
const { body, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")
const { teamInvites, teamInviteAccepted } = require("../models/invite/consts")
const { inviteExistsById, inviteIsPending } = require("../models/invite/utils")

const Invites = mongoose.model("Invites")
const Teams = mongoose.model("Teams")

router.patch(
	"/:inviteId",
	checkJWT(),
	[
		param("inviteId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(inviteExistsById)
			.bail()
			.custom(inviteIsPending),
		body("newStatus").isIn(teamInvites),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { newStatus } = req.body

			const invite = await Invites.findById(req.params.inviteId).lean()

			if (invite.userId.toString() !== req.user.id)
				return res
					.status(403)
					.json({ errorMessage: "Cannot accept another person's invite" })

			if (newStatus === teamInviteAccepted) {
				const team = await Teams.find({
					tournamentId: invite.tournamentId,
					_id: invite.teamId.toString(),
				}).lean()
				if (!team)
					return res.status(404).json({
						errorMessage: "The team the user is invited to does not exist",
					})
				await Teams.updateOne(
					{
						_id: invite.teamId,
					},
					{
						$push: {
							members: {
								userId: invite.userId,
								dateJoined: Date().toLocaleString("en-US", {
									timeZone: "Europe/Rome",
								}),
							},
						},
					}
				)
			}

			await Invites.findByIdAndUpdate(req.params.inviteId, {
				$set: { status: newStatus },
			})

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

router.delete(
	"/:inviteId",
	[
		param("inviteId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(inviteExistsById)
			.bail()
			.custom(inviteIsPending),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			await Invites.deleteOne({ _id: req.params.inviteId })
			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
