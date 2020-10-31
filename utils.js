const bodyParser = require("body-parser")
const { validationResult } = require("express-validator")

const jsonParser = bodyParser.json()

const checkValidation = (req, res, next) => {
	const validationErrors = validationResult(req)
	if (!validationErrors.isEmpty())
		return res.status(400).json({ errors: validationErrors.array() })
	next()
}
module.exports = {
	jsonParser,
	checkValidation,
}
