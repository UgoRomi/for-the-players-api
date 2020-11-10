require("dotenv").config()

const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const compression = require("compression")
const app = express()
const connectionError = require("./db")
const _ = require("lodash")

// Docs
const swaggerUi = require("swagger-ui-express")
const YAML = require("yamljs")
const swaggerDocument = YAML.load("./swagger.yaml")
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

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
const platformRoutes = require("./routes/platforms")

app.use("/auth", authRoutes)
app.use("/team", teamRoutes)
app.use("/platform", platformRoutes)

// Error handling
app.use((error, req, res, next) => {
	if (!error.statusCode) error.statusCode = 500

	return res.status(error.statusCode).json({ error: error.toString() })
})

app.listen(process.env.PORT, () => {
	console.log(`listening on port ${process.env.PORT}`)
})
