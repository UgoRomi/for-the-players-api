const error404 = "NotFoundError"
const error403 = "ForbiddenError"

class CustomError {
	name
	message

	constructor(name, message) {
		this.name = name
		this.message = message
	}
}

module.exports = {
	error404,
	error403,
	CustomError,
}
