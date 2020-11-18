const mongoose = require("mongoose")
const Game = mongoose.model("Game")

const checkIfGameExists = async (gameId) => {
	const gameExists = await Game.findOne({
		_id: gameId,
	})

	if (!gameExists) throw Error("Game does not exists")
}

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

const _checkUniqueField = async (fieldName, fieldValue) => {
	const fieldAlreadyExists = await Game.findOne({
		[fieldName]: fieldValue,
	})
	if (fieldAlreadyExists) throw Error(`${fieldName} already in use`)
}

module.exports = {
	checkIfGameExists,
	checkUniqueName,
}
