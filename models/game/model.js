const { Schema, model, ObjectId } = require("mongoose")

const gameSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		addedBy: { type: ObjectId, required: true, ref: "Users" },
		imgUrl: { type: String, required: true },
	},
	{ timestamps: true }
)

const game = model("Games", gameSchema)

module.exports = game
