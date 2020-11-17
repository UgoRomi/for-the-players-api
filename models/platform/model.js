const { Schema, model, ObjectId } = require("mongoose")

const gameSubSchema = new Schema(
	{
		id: { type: ObjectId, required: true, ref: "Game" },
		show: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true }
)

const platformSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		show: { type: Boolean, required: true, default: false },
		games: [gameSubSchema],
	},
	{ timestamps: true }
)

const platform = model("Platform", platformSchema)

module.exports = platform
