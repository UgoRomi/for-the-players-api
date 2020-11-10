const { userPermissionCreatePlatform } = require("../models/user/consts")
const { checkValidation, checkJWT } = require("../utils")
const { body } = require("express-validator")
const { jsonParser } = require("../utils")
const router = require("express").Router()
const Platform = require("../models/platform/model")

router.post(
	"/",
	jsonParser,
	[
		body("name").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
		body("show").isBoolean(),
	],
	checkValidation,
	checkJWT([userPermissionCreatePlatform]),
	async (req, res, next) => {
		try {
			await Platform.create({
				name: req.body.name,
				show: req.body.show,
			})
			return res.status(200).json()
		} catch (e) {
			return next(e)
		}
	}
)

module.exports = router
