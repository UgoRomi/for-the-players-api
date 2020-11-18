const mongoose = require("mongoose")
mongoose.set("debug", false)
try {
	mongoose.connect(process.env.DB_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
} catch (e) {
	return e
}
const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", function () {
	console.log("DB Connection started")
})