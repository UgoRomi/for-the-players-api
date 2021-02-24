const { Schema, model, ObjectId } = require('mongoose');
const { teamSubmittedResults } = require('./consts');

const matchSchema = new Schema({
  tournamentId: { type: ObjectId, ref: 'Tournaments', required: true },
  teamOne: { type: ObjectId, required: true },
  teamTwo: ObjectId,
  createdAt: { type: Date, required: true, default: Date.now() },
  acceptedAt: { type: Date },
  numberOfPlayers: { type: Number },
  rulesetId: { type: String, ref: 'Rulesets' },
  teamOneResult: { type: String, enum: teamSubmittedResults },
  teamTwoResult: { type: String, enum: teamSubmittedResults },
  maps: [
    {
      type: String,
    },
  ],
});

matchSchema.index({ tournamentId: 1 });

const matches = model('Matches', matchSchema);

module.exports = matches;
