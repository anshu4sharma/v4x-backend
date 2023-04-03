const express = require('express')

const router = express.Router()

const register = require('./register')

const staking = require('./staking')

const Withdraw = require('./Withdraw')

const user = require('./user')

router.use('/registration', register)

router.use('/staking', staking)

router.use('/user', user)

router.use('/Withdraw', Withdraw)


module.exports = router