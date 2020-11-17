const bodyParser = require("body-parser")
const { validationResult } = require("express-validator")
const _ = require("lodash")
const jwt = require("jsonwebtoken")
const { formatISO, parseISO } = require("date-fns")
const mongoose = require("mongoose")
const {
	userStatusBanned,
	userStatusNotVerified,
} = require("./models/user/consts")

const User = mongoose.model("User")
const jsonParser = bodyParser.json()

const checkValidation = (req, res, next) => {
	const validationErrors = validationResult(req)
	if (!validationErrors.isEmpty())
		return res.status(400).json({ errors: validationErrors.array() })
	next()
}

const checkJWT = (requiredPermissions) => {
	return async (req, res, next) => {
		try {
			if (!_.has(req.headers, "authorization"))
				return res
					.status(401)
					.json({ errorMessage: "'Authorization' header not found" })
			const authHeader = req.headers.authorization
			if (!authHeader)
				return res
					.status(401)
					.json({ errorMessage: "'Authorization' header is empty" })

			const bearerToken = authHeader.split("Bearer ").pop()
			if (!bearerToken)
				return res
					.status(401)
					.json({ errorMessage: "'Authorization' header wrongly formatted" })

			let decodedToken
			try {
				decodedToken = jwt.verify(bearerToken, process.env.JWT_SECRET)
			} catch (e) {
				return res.status(401).json({ errorMessage: "Invalid Bearer token" })
			}

			if (!decodedToken)
				return res.status(401).json({ errorMessage: "Invalid Bearer token" })

			const user = await User.findOne({
				email: decodedToken.email,
			}).lean()
			if (!user)
				return res.status(401).json({ errorMessage: "Invalid Bearer token" })

			if (user.status === userStatusBanned)
				return res.status(403).json({ errorMessage: "User is banned" })

			if (user.status === userStatusNotVerified)
				return res.status(403).json({ errorMessage: "User not verified" })

			const permissions =
				requiredPermissions && _.isString(requiredPermissions)
					? [requiredPermissions]
					: requiredPermissions

			if (
				permissions &&
				permissions.length > 0 &&
				(!user.permissions ||
					!permissions.every((permission) =>
						user.permissions.includes(permission)
					))
			)
				return res
					.status(403)
					.json({ errorMessage: "Insufficient permissions" })

			req.user = {
				email: decodedToken.email,
				id: decodedToken.id,
			}
			return next()
		} catch (e) {
			return next(e)
		}
	}
}

const convertToMongoId = (id) => {
	return mongoose.Types.ObjectId(id)
}

const toISO = (date) => {
	if (date instanceof Date) return formatISO(date)
	return parseISO(date)
}

module.exports = {
	jsonParser,
	checkValidation,
	checkJWT,
	convertToMongoId,
	toISO,
}
