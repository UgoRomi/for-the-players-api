const router = require("express").Router()
const { body, param } = require("express-validator")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const {
	userStatusBanned,
	userStatusVerified,
} = require("../models/user/consts")
const { checkValidation, checkJWT } = require("../utils/custom-middlewares")
const {
	checkUserEmailInUse,
	checkUniqueEmail,
	checkUserNotVerified,
	checkUniqueUsername,
} = require("../models/user/utils")
const mongoose = require("mongoose")
const transporter = require("../email")
const { resetPasswordPage } = require("../models/user/consts")

const User = mongoose.model("Users")

router.post(
	"/signup",
	[
		body("username")
			.not()
			.isEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueUsername),
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
			const token = jwt.sign(
				{
					email: newUser.email,
					id: newUser._id,
				},
				process.env.JWT_SECRET
			)
			return res.status(201).json({ ...newUser._doc, token })
		} catch (e) {
			return next(e)
		}
	}
)

router.post(
	"/login",
	[
		body("email")
			.notEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.isEmail()
			.normalizeEmail()
			.custom(checkUserEmailInUse),
		body("password").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const { email, password } = req.body
			const userOnDB = await User.findOne({ email }).lean()

			// If the password is wrong
			if (!bcrypt.compareSync(password, userOnDB.password))
				return res.status(400).json({ error: "Password does not match" })

			if (userOnDB.status === userStatusBanned)
				return res.status(400).json({ error: "User is banned" })

			const token = jwt.sign(
				{
					email,
					id: userOnDB._id,
				},
				process.env.JWT_SECRET
			)
			return res.json({ token, status: userOnDB.status })
		} catch (e) {
			next(e)
		}
	}
)

router.get("/email", checkJWT([], false), async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id)
		if (!user) return res.status(404).json({ errorMessage: "User not found" })
		if (user.status === userStatusVerified)
			return res.status(400).json({ errorMessage: "User already verified" })

		await transporter.sendMail({
			from: process.env.EMAIL_USERNAME, // sender address
			to: req.user.email, // list of receivers
			subject: "Conferma account 4ThePlayers", // Subject line
			text: `Per confermare il tuo account copia e incolla il seguente link in una finestra del tuo browser ${req.headers.host}/auth/${req.user.id}/verify`, // plain text body
			html: `Clicca sul seguente link per confermare il tuo account <a href='${req.headers.host}/auth/${req.user.id}/verify'>${req.headers.host}/auth/${req.user.id}/verify</a><br>Se il link non funziona prova a copiarlo e incollarlo in un'altra finestra del tuo browser`, // html body
		})
		return res.status(200).json()
	} catch (e) {
		next(e)
	}
})

router.get(
	"/:userId/verify",
	[param("userId").notEmpty().custom(checkUserNotVerified)],
	checkValidation,
	async (req, res, next) => {
		try {
			await User.findByIdAndUpdate(req.params.userId, {
				status: userStatusVerified,
			})
			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

router.post(
	"/password",
	[body("email").isEmail()],
	checkValidation,
	async (req, res, next) => {
		try {
			const { email } = req.body

			const userExists = await User.findOne({ email }).lean()

			if (!userExists) return res.status(200).json()

			const token = jwt.sign(
				{
					email,
					id: userExists._id,
				},
				process.env.JWT_SECRET
			)

			await transporter.sendMail({
				from: process.env.EMAIL_USERNAME, // sender address
				to: email, // list of receivers
				subject: "Reset password 4ThePlayers", // Subject line
				text: `Per reimpostare la password del tuo account copia e incolla il seguente link in una finestra del tuo browser ${resetPasswordPage}?jwt=${token}`, // plain text body
				html: `Clicca <a href='${resetPasswordPage}?jwt=${token}'>qui</a> per reimpostare la password del tuo account`, // html body
			})

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

router.patch(
	"/password",
	checkJWT(),
	[body("newPassword").isString()],
	checkValidation,
	async (req, res, next) => {
		try {
			const newPassword = bcrypt.hashSync(
				req.body.newPassword,
				parseInt(process.env.PASSWORD_SALT_ROUNDS)
			)

			await User.updateOne({ _id: req.user.id }, { password: newPassword })

			return res.status(200).json()
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
