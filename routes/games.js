const { body } = require("express-validator")
const { checkImgInput } = require("../utils/helpers")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const router = require("express").Router()
const { userPermissionCreateGame } = require("../models/user/consts")
const mongoose = require("mongoose")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const { checkUniqueName } = require("../models/game/utils")

const Game = mongoose.model("Games")

router.get("/", checkJWT(), async (req, res, _next) => {
	// Get all games
	const games = await Game.find({})

	return res.status(200).json(
		games.map((game) => {
			return {
				name: game.name,
				id: game._id,
				imgUrl: game.imgUrl,
			}
		})
	)
})

router.post(
	"/",
	[
		body("name")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueName),
		body("imgUrl").optional().isURL(),
		body("imgBase64").isBase64().custom(checkIfValidaImageData),
	],
	checkJWT([userPermissionCreateGame]),
	checkValidation,
	async (req, res, next) => {
		try {
			const imageURL = await checkImgInput(req.body)

			await Game.create({
				name: req.body.name,
				addedBy: req.user.id,
				imgUrl: imageURL,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
