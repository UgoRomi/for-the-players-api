const router = require("express").Router()
const { query, param } = require("express-validator")
const { checkJWT, checkValidation } = require("../utils/custom-middlewares")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const { checkUniqueUsername } = require("../models/user/utils")
const { body } = require("express-validator")
const { isLoggedInUser } = require("../models/user/utils")
const { teamStatusOk, teamStatusNotOk } = require("../models/tournament/consts")
const { userExistsById } = require("../models/user/utils")
const { isBefore, startOfToday } = require("date-fns")

const Users = mongoose.model("Users")
const Tournament = mongoose.model("Tournaments")
const Invites = mongoose.model("Invites")
const Games = mongoose.model("Games")
const Platforms = mongoose.model("Platforms")
const Rulesets = mongoose.model("Rulesets")

router.get(
	"/",
	checkJWT(),
	[query("username"), query("email")],
	checkValidation,
	async (req, res, next) => {
		try {
			const { username, email } = req.query

			const findObject = {}

			if (username) findObject.username = { $regex: username, $options: "i" }
			if (email) findObject.email = { $regex: email, $options: "i" }

			const users = await Users.find(findObject, {
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

router.get(
	"/:userId",
	checkJWT(),
	[param("userId").custom(userExistsById)],
	checkValidation,
	async (req, res, next) => {
		try {
			const user = await Users.findById(req.params.userId, {
				elo: 1,
				email: 1,
				username: 1,
				createdAt: 1,
				platforms: 1,
			}).lean()

			user.invites = await Invites.find(
				{
					userId: req.params.userId,
				},
				"tournamentId teamId status"
			).lean()

			const tournaments = await Tournament.find(
				{
					"teams.members": { $elemMatch: { userId: req.params.userId } },
				},
				"_id name game endsOn platform ruleset type teams"
			).lean()

			user.tournaments = await Promise.all(
				tournaments.map(async (tournament) => {
					const { _id, name, type } = tournament
					const game = await Games.findById(
						tournament.game.toString(),
						"name"
					).lean()
					const platform = await Platforms.findById(
						tournament.platform.toString(),
						"name"
					).lean()
					const finished = isBefore(startOfToday(), tournament.endsOn)

					// Get the team the user is a part of, if it exists
					const userTeam = tournament.teams.find((team) =>
						team.members.some(
							(member) => member.userId.toString() === req.params.userId
						)
					)
					const ruleset = await Rulesets.findById(
						tournament.ruleset.toString(),
						"maxNumberOfPlayersPerTeam minNumberOfPlayersPerTeam"
					)

					const teamStatus =
						userTeam.members.length <= ruleset.maxNumberOfPlayersPerTeam &&
						userTeam.members.length >= ruleset.minNumberOfPlayersPerTeam
							? teamStatusOk
							: teamStatusNotOk

					return {
						_id,
						name,
						game,
						finished,
						platform,
						type,
						team: {
							name: userTeam.name,
							teamStatus,
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
		body("oldPassword").notEmpty({ ignore_whitespace: true }),
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

			// If the password is wrong
			if (!bcrypt.compareSync(req.body.oldPassword, userOnDB.password))
				return res.status(400).json({ error: "Old password does not match" })

			const updateObj = {}

			if (req.body.platforms) updateObj.platforms = req.body.platforms

			if (req.body.username) updateObj.username = req.body.username

			if (req.body.newPassword)
				updateObj.password = bcrypt.hashSync(
					req.body.newPassword,
					parseInt(process.env.PASSWORD_SALT_ROUNDS)
				)

			await Users.updateOne({ _id: req.params.userId }, { $set: updateObj })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
