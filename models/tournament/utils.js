const mongoose = require("mongoose")

const Tournament = mongoose.model("Tournament")

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

const _checkUniqueField = async (fieldName, fieldValue) => {
	const fieldAlreadyExists = await Tournament.findOne({
		[fieldName]: fieldValue,
	})
	if (fieldAlreadyExists) throw Error(`${fieldName} already in use`)
}

module.exports = {
	checkUniqueName,
}