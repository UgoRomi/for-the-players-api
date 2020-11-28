const {
	userPermissionPlatform,
	userPermissionGame,
} = require("../models/user/consts")
const { checkValidation, checkJWT } = require("../utils/custom-middlewares")
const { body, param } = require("express-validator")
const router = require("express").Router()
const mongoose = require("mongoose")
const { checkImgInput } = require("../utils/helpers")
const { checkIfValidaImageData } = require("../utils/custom-validators")
const {
	checkUniqueName,
	checkIfPlatformExists,
} = require("../models/platform/utils")
const { convertToMongoId } = require("../utils/custom-sanitizers")

const Platform = mongoose.model("Platforms")

router.post(
	"/",
	[
		body("name")
			.not()
			.isEmpty({ ignore_whitespace: true })
			.trim()
			.escape()
			.custom(checkUniqueName),
		body("show").isBoolean(),
		body("imgUrl").optional().isURL(),
		body("imgBase64").isBase64().custom(checkIfValidaImageData),
	],
	checkJWT([userPermissionPlatform]),
	checkValidation,
	async (req, res, next) => {
		const imageURL = await checkImgInput(req.body)

		try {
			await Platform.create({
				name: req.body.name,
				show: req.body.show,
				imgUrl: imageURL,
			})
			return res.status(201).json()
		} catch (e) {
			return next(e)
		}
	}
)

router.get("/", checkJWT(), async (req, res, next) => {
	try {
		const findObject = {}
		if (!req.user.permissions.includes(userPermissionPlatform))
			findObject.show = true
		const platforms = await Platform.find(findObject, {
			"_id": 1,
			"name": 1,
			"imgUrl": 1,
			"games.id": 1,
			"games.name": 1,
		}).lean()

		return res.status(200).json({ platforms })
	} catch (e) {
		next(e)
	}
})

router.get(
	"/:platformId",
	checkJWT(),
	[
		param("platformId")
			.customSanitizer(convertToMongoId)
			.bail()
			.custom(checkIfPlatformExists),
	],
	checkValidation,
	async (req, res, next) => {
		try {
			const platform = await Platform.findById(req.params.platformId).lean()
			if (
				!platform.show &&
				!req.user.permissions.includes(userPermissionPlatform)
			)
				return res
					.status(403)
					.json({ errorMessage: "Cannot access the requested platform" })

			const { name, show, imageUrl } = platform
			let { games } = platform

			if (!req.user.permissions.includes(userPermissionGame))
				games = games.filter((game) => game.show)

			return res.status(200).json({
				name,
				show,
				imageUrl,
				games: games.map((game) => {
					return { id: game._id.toString(), name: game.name, show: game.show }
				}),
			})
		} catch (e) {
			next(e)
		}
	}
)

module.exports = router
