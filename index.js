require('dotenv').config()
require('./config/db')
const express = require('express')
const cors = require('cors')
const swaggerJson = require("./swagger/swagger.json");
const swaggerUi = require("swagger-ui-express");

const app = express()
app.use(cors())
const routes = require('./routes/index')

app.use(
    express.json({
        limit: '1024mb',
    }),
)
app.use(
    express.urlencoded({
        limit: '1024mb',
        extended: true,
    }),
)

app.use('/api', routes)
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerJson));

const LOCALPORT = process.env.PORT || 8080

app.listen(LOCALPORT, () => {
    console.log(`http://localhost:${LOCALPORT} is listening...`)
})