const { Schema, model, ObjectId } = require("mongoose")

const gameSchema = new Schema(
	{
		name: String,
		maxNumberOfPlayersPerTeam: Number,
		addedBy: ObjectId,
	},
	{ timestamps: true }
)
