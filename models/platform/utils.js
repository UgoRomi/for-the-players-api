const mongoose = require("mongoose")
const Platform = mongoose.model("Platforms")

const checkIfPlatformExists = async (platformId) => {
	const platformExists = await Platform.findOne({
		_id: platformId,
	})

	if (!platformExists) throw Error("Platform does not exists")
}

const checkUniqueName = async (platformName) => {
	const platformExists = await Platform.findOne({
		name: platformName,
	})

	if (platformExists)
		throw Error(`Platform named ${platformName} already exists`)
}

module.exports = {
	checkIfPlatformExists,
	checkUniqueName,
}
