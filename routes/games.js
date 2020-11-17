const { body } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils")
const router = require("express").Router()
const { userPermissionCreateGame } = require("../models/user/consts")
const mongoose = require("mongoose")

const Game = mongoose.model("Game")

router.get("/", checkJWT(), async (req, res, _next) => {
	// Get all games
	const games = await Game.find({})

	return res.status(200).json(
		games.map((game) => {
			return {
				name: game.name,
				id: game._id,
			}
		})
	)
})

router.post(
	"/",
	[body("name").not().isEmpty({ ignore_whitespace: true }).trim().escape()],
	checkJWT([userPermissionCreateGame]),
	checkValidation,
	async (req, res, next) => {
		try {
			await Game.create({
				name: req.body.name,
				addedBy: req.user.id,
			})
			return res.status(201).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
