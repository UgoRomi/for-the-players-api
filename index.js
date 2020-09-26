require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const path = require('path');

const app = express()
app.use(helmet())
app.use(morgan('short'))
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.json({
        message: 'working'
    })
})

app.use('/docs', express.static(path.join(__dirname, 'apidoc')))

app.listen(process.env.PORT, () => {
    console.log(`listening on port ${process.env.PORT}`)
})
