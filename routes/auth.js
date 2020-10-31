const router = require("express").Router()
const User = require("../models/user")
const {body} = require("express-validator")
const {jsonParser} = require("../utils")
const jwt = require("jsonwebtoken")
const {checkValidation} = require("../utils")
const {checkIfUserExists, checkUniqueEmail} = require("../models/utils/users")

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
			const newUser = await User.query().insert({
				username: req.body.username,
				password: req.body.password,
				email: req.body.email,
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
router.post(
	"/login",
	jsonParser,
	[
		body("email")
			.not()
			.isEmpty({ignore_whitespace: true})
			.trim()
			.escape()
			.isEmail()
			.normalizeEmail()
			.custom(checkIfUserExists),
		body("password").not().isEmpty({ignore_whitespace: true}).trim().escape(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const {email, password} = req.body
			const userOnDB = await User.query().findOne({email})

			// If the password is wrong
			if (!(await userOnDB.checkCredentials(password)))
				return res.status(400).json({error: "Password does not match"})

			const token = jwt.sign({email}, process.env.JWT_SECRET)

			res.json({token})
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
