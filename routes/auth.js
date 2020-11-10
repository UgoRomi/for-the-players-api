const router = require("express").Router()
const User = require("../models/user/model")
const { body } = require("express-validator")
const { jsonParser } = require("../utils")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { userStatusNotVerified } = require("../models/user/consts")
const { userStatusBanned } = require("../models/user/consts")
const { checkValidation } = require("../utils")
const { checkIfUserExists, checkUniqueEmail } = require("../models/user/utils")

router.post(
	"/signup",
	jsonParser,
	[
		body("username").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
		body("password").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
		body("email").isEmail().normalizeEmail().custom(checkUniqueEmail),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const newUser = await User.create({
				username: req.body.username,
				password: req.body.password,
				email: req.body.email,
				permissions: [],
			})
			return res.json(newUser)
		} catch (e) {
			return next(e)
		}
	}
)

router.post(
	"/login",
	jsonParser,
	[
		body("email")
			.not()
			.isEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.isEmail()
			.normalizeEmail()
			.custom(checkIfUserExists),
		body("password").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { email, password } = req.body
			const userOnDB = await User.findOne({ email }).exec()

			// If the password is wrong
			if (!bcrypt.compareSync(password, userOnDB.password))
				return res.status(400).json({ error: "Password does not match" })

			if (userOnDB.status === userStatusBanned)
				return res.status(400).json({ error: "User is banned" })

			if (userOnDB.status === userStatusNotVerified)
				return res.status(400).json({ error: "User is not verified" })

			const token = jwt.sign({ email }, process.env.JWT_SECRET)
			res.json({ token })
		} catch (e) {
			next(e)
		}
	}
)

/**
 * @api {post} /auth/forgot-password Forgot Password
 * @apiName Forgot Password
 * @apiGroup Auth
 *
 * @apiParam {String} email             The user's email
 */
router.post("/forgot-password", (req, res) => {
	res.json({ message: "forgot-password called" })
})

module.exports = router
