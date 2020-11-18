const { Schema, model, ObjectId } = require("mongoose")

const gameSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		addedBy: { type: ObjectId, required: true, ref: "User" },
		imgUrl: { type: String, required: true },
	},
	{ timestamps: true }
)

const game = model("Game", gameSchema)

module.exports = game
