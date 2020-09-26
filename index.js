require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();

// Middlewares
app.use(helmet());
app.use(morgan("short"));
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");

app.get("/", (req, res) => {
  res.json({
    message: "working",
  });
});

app.get("/auth", authRoutes);

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
