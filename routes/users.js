const router = require("express").Router()
const { query, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const { checkUniqueUsername } = require("../models/user/utils")
const { body } = require("express-validator")
const { isLoggedInUser } = require("../models/user/utils")
const { userExistsById } = require("../models/user/utils")
const { isBefore, startOfToday } = require("date-fns")

const Users = mongoose.model("Users")
const Tournaments = mongoose.model("Tournaments")
const Invites = mongoose.model("Invites")
const Games = mongoose.model("Games")
const Platforms = mongoose.model("Platforms")
const Teams = mongoose.model("Teams")

router.get(
	"/",
	checkJWT(),
	[query("username"), query("email"), query("status")],
	checkValidation,
	async (req, res, next) => {
		try {
			const { username, email, status } = req.query

			const findObject = {}

			if (username) findObject.username = { $regex: username, $options: "i" }
			if (email) findObject.email = { $regex: email, $options: "i" }
			if (status) findObject.status = { $regex: status, $options: "i" }

			const users = await Users.find(findObject, {
				status: 1,
				username: 1,
				email: 1,
				_id: 1,
			})

			return res.status(200).json(users)
		} catch (e) {
			next(e)
		}
	}
)

/**
 * Get user details
 */
router.get(
	"/:userId",
	checkJWT(),
	[param("userId").isMongoId().bail().custom(userExistsById)],
	checkValidation,
	async (req, res, next) => {
		try {
			const user = await Users.findById(req.params.userId, {
				elo: 1,
				email: 1,
				username: 1,
				createdAt: 1,
				platforms: 1,
				coins: 1,
			}).lean()

			user.invites = await Invites.find(
				{
					userId: req.params.userId,
				},
				"tournamentId teamId status"
			).lean()

			const userTeams = await Teams.find({
				members: { $elemMatch: { userId: req.params.userId } },
			}).lean()
			const userTournaments = await Tournaments.find({
				_id: { $in: userTeams.map((team) => team.tournamentId) },
			}).lean()

			user.tournaments = await Promise.all(
				userTournaments.map(async (userTournament) => {
					const { _id, name, type } = userTournament
					const game = await Games.findById(
						userTournament.game.toString(),
						"name"
					).lean()
					const platform = await Platforms.findById(
						userTournament.platform.toString(),
						"name"
					).lean()
					const finished = isBefore(startOfToday(), userTournament.endsOn)

					// Get the team the user is a part of
					const userTeam = userTeams.find(
						(team) =>
							team.tournamentId.toString() === userTournament._id.toString()
					)

					return {
						_id,
						name,
						game,
						finished,
						platform,
						type,
						team: {
							name: userTeam.name,
						},
					}
				})
			)

			return res.status(200).json({ user })
		} catch (e) {
			next(e)
		}
	}
)

/**
 * @param req.body
 * @param req.body.oldPassword
 * @param req.body.newPassword
 * @param req.body.username
 * @param req.body.platforms[]._id
 * @param req.body.platforms[].username
 */
router.patch(
	"/:userId",
	checkJWT(),
	// TODO: Don't replace platforms but just update the usernames
	[
		param("userId").custom(userExistsById).bail().custom(isLoggedInUser),
		body("oldPassword").optional(),
		body("newPassword")
			.optional()
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape(),
		body("username")
			.optional()
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueUsername),
		body("platforms.*._id").isMongoId(),
		body("platforms.*.username").isString().trim().escape(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const userOnDB = await Users.findById(req.params.userId).lean()

			const updateObj = {}

			if (req.body.newPassword) {
				// If the password is wrong
				if (!bcrypt.compareSync(req.body.oldPassword, userOnDB.password))
					return res.status(400).json({ error: "Old password does not match" })
				updateObj.password = bcrypt.hashSync(
					req.body.newPassword,
					parseInt(process.env.PASSWORD_SALT_ROUNDS)
				)
			}

			if (req.body.platforms) updateObj.platforms = req.body.platforms

			if (req.body.username) updateObj.username = req.body.username

			await Users.updateOne({ _id: req.params.userId }, { $set: updateObj })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
