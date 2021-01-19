require("dotenv").config()

const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const compression = require("compression")
const app = express()
const connectionError = require("./db")
const _ = require("lodash")
const bodyParser = require("body-parser")
const rateLimit = require("express-rate-limit")

app.set("trust proxy", true)

require("./models/user/model")
require("./models/tournament/model")
require("./models/platform/model")
require("./models/ruleset/model")
require("./models/game/model")
require("./models/imgurToken/model")
require("./models/invite/model")
require("./models/ticket/model")

// Docs
const swaggerUi = require("swagger-ui-express")
const YAML = require("yamljs")
const swaggerDocument = YAML.load("./swagger.yaml")
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

if (!_.isEmpty(connectionError)) return

// Middlewares
app.use(helmet())
// noinspection JSCheckFunctionSignatures
app.use(morgan("dev"))
app.use(cors())
app.use(express.json({ limit: "10mb" }))
// noinspection JSCheckFunctionSignatures
app.use(compression())
app.use(bodyParser.json())

// Routes
const authRoutes = require("./routes/auth")
const platformRoutes = require("./routes/platforms")
const gameRoutes = require("./routes/games")
const tournamentRoutes = require("./routes/tournaments")
const rulesetRoutes = require("./routes/rulesets")
const invitesRoutes = require("./routes/invites")
const userRoutes = require("./routes/users")
const ticketRoutes = require("./routes/tickets")

const limiter = rateLimit({
	windowMs: 1000, // 15 minutes
	max: 1, // limit each IP to 100 requests per windowMs
})

//  apply to all requests
app.use(limiter)

app.use("/auth", authRoutes)
app.use("/platforms", platformRoutes)
app.use("/games", gameRoutes)
app.use("/tournaments", tournamentRoutes)
app.use("/rulesets", rulesetRoutes)
app.use("/invites", invitesRoutes)
app.use("/users", userRoutes)
app.use("/tickets", ticketRoutes)

app.use("/test", (_req, res, _next) => {
	res.send("Welcome to 4TP APIs!")
})

// Error handling
//404
app.use("*", (req, res, _next) => {
	return res.status(404).json({ error: `URL ${req.baseUrl} not found` })
})

app.use((error, req, res, next) => {
	if (!error.statusCode) error.statusCode = 500

	if (process.env.DEBUG && process.env.DEBUG === "true") return next(error)

	return res.status(error.statusCode).json({ error: error.toString() })
})

app.listen(process.env.PORT, () => {
	console.log(`listening on port ${process.env.PORT}`)
})
