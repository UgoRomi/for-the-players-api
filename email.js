const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
	host: "ssl0.ovh.net",
	port: 465,
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD,
	},
})

module.exports = transporter