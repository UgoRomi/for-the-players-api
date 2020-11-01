require("dotenv").config()

const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const compression = require("compression")
const app = express()
const connectionError = require("./db")
const _ = require("lodash")
if (!_.isEmpty(connectionError)) return

// Middlewares
app.use(helmet())
app.use(morgan("tiny"))
app.use(cors())
app.use(express.json())
app.use(compression())

// Routes
const authRoutes = require("./routes/auth")
const teamRoutes = require("./routes/teams")

app.use("/auth", authRoutes)
app.use("/teams", teamRoutes)

app.listen(process.env.PORT, () => {
	console.log(`listening on port ${process.env.PORT}`)
})
