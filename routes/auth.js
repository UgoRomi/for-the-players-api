const router = require("express").Router()
const User = require("../models/user")
const { body, validationResult } = require("express-validator")
const { jsonParser } = require("../utils")
const bcrypt = require("bcrypt")
const { userStatuses } = require("../models/utils/consts")
const { checkUniqueEmail } = require("../models/utils/users")

/**
 * @api {post} /auth/register Register
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam {String} username          The new user's username
 * @apiParam {String} email             The new user's email
 * @apiParam {String} password          The new user's password
 *
 * @apiSuccess {String} username        Username of the newly registered user
 * @apiSuccess {String} email           Email of the newly registered user
 */
router.post(
	"/register",
	jsonParser,
	[
		body("username").not().isEmpty().trim().escape(),
		body("password").not().isEmpty().trim().escape(),
		body("email").isEmail().normalizeEmail().custom(checkUniqueEmail),
	],
	async (req, res, next) => {
		const validationErrors = validationResult(req)
		if (!validationErrors.isEmpty())
			return res.status(400).json({ errors: validationErrors.array() })

		try {
			const newUser = await User.query().insert({
				username: req.body.username,
				password: bcrypt.hashSync(
					req.body.password,
					parseInt(process.env.PASSWORD_SALT_ROUNDS)
				),
				email: req.body.email,
				status: userStatuses[0],
			})
			return res.json(newUser)
		} catch (e) {
			return next(e)
		}
	}
)

/**
 * @api {post} /auth/login Login
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam {String} email             The user's email
 * @apiParam {String} password          The user's password
 *
 * @apiSuccess {String} jwt             JWT for the session
 */
router.post("/login", (req, res) => {
	res.json({ message: "login called" })
})

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
