const mongoose = require("mongoose")
const Game = mongoose.model("Game")

const checkIfGameExists = async (gameId) => {
	const gameExists = await Game.findOne({
		_id: gameId,
	})

	if (!gameExists) throw Error("Game does not exists")
}

module.exports = {
	checkIfGameExists,
}