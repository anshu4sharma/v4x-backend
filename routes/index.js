const express = require('express')

const router = express.Router()

const register = require('./register')

router.use('/registration', register)

module.exports = router