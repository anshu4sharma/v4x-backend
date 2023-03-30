const express = require('express')

const router = express.Router()

const register = require('./register')

const staking = require('./staking')

const user = require('./user')

router.use('/registration', register)

router.use('/staking', staking)

router.use('/user', user)

module.exports = router