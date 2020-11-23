const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD,
	},
})

module.exports = transporter