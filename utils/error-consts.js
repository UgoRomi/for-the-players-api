const error404 = "NotFoundError"

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
	CustomError,
}
