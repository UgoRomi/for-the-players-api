const mongoose = require("mongoose")
const Platform = mongoose.model("Platform")

const checkIfPlatformExists = async (platformId) => {
	const platformExists = await Platform.findOne({
		_id: platformId,
	})

	if (!platformExists) throw Error("Platform does not exists")
}

module.exports = {
	checkIfPlatformExists,
}