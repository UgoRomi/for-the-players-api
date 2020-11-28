const router = require("express").Router()
const { body, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const { convertToMongoId } = require("../utils/custom-sanitizers")
const mongoose = require("mongoose")
const { teamInvites } = require("../models/invite/consts")
const { inviteExistsById, inviteIsPending } = require("../models/invite/utils")

const Invite = mongoose.model("Invites")

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
		body("newStatus").notEmpty().isIn(teamInvites),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			await Invite.findByIdAndUpdate(req.params.inviteId, {
				$set: { status: req.body.newStatus },
			})
			return res.status(200).json({})
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
			await Invite.deleteOne({ _id: req.params.inviteId })
			return res.status(200).json({})
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
