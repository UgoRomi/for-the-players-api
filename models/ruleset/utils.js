const mongoose = require("mongoose")
const Ruleset = mongoose.model("Rulesets")

const checkIfRulesetExists = async (rulesetId) => {
	const rulesetExists = await Ruleset.findOne({
		_id: rulesetId,
	})

	if (!rulesetExists) throw Error("Ruleset does not exists")
}

module.exports = {
	checkIfRulesetExists,
}