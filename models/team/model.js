const { teamRoles, teamRoleMember } = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const teamSchema = new Schema({
	tournamentId: { type: ObjectId, ref: "Tournaments", required: true },
	name: { type: String, required: true },
	// elo is user for ladders, points for tournaments
	elo: { type: Number },
	points: { type: Number },
	imgUrl: { type: String },
	invites: [{}],
	members: [
		{
			role: {
				type: String,
				enum: teamRoles,
				required: true,
				default: teamRoleMember,
			},
			dateJoined: { type: Date, required: true, default: Date.now() },
			userId: { type: ObjectId, ref: "Users", required: true },
		},
	],
})

teamSchema.index({ tournamentId: 1, name: 1 }, { unique: true })

const teams = model("Teams", teamSchema)

module.exports = teams
