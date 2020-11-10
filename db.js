const mongoose = require("mongoose")
try {
	mongoose.connect(process.env.DB_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
} catch (e) {
	return e
}
const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", function () {
	console.log("DB Connection started")
	// we're connected!
})