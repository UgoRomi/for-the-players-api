const { Schema, model, ObjectId } = require("mongoose")

const gameSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		maxNumberOfPlayersPerTeam: { type: Number, required: true },
		addedBy: { type: ObjectId, required: true },
	},
	{ timestamps: true }
)

const game = model("Game", gameSchema)

module.exports = game
