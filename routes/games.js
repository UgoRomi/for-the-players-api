const { body } = require("express-validator")

const { checkJWT, checkValidation } = require("../utils")
const router = require("express").Router()
const Game = require("../models/game/model")
const { userPermissionCreateGame } = require("../models/user/consts")

router.get("/", checkJWT(), async (req, res, _next) => {
	// Get all games
	const games = await Game.find({})

	return res.status(200).json(
		games.map((game) => {
			return {
				name: game.name,
				maxNumberOfPlayersPerTeam: game.maxNumberOfPlayersPerTeam,
			}
		})
	)
})

router.post(
	"/",
	[
		body("name").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
		body("maxNumberOfPlayersPerTeam").isNumeric(),
	],
	checkValidation,
	checkJWT([userPermissionCreateGame]),
	async (req, res, next) => {
		try {
			await Game.create({
				name: req.body.name,
				maxNumberOfPlayersPerTeam: req.body.maxNumberOfPlayersPerTeam,
				addedBy: req.user.id,
			})
			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
