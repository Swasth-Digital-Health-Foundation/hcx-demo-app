var express = require('express');
var router = express.Router();
const coverageRouter = require('./coverage');
const claimRouter = require('./claim');

router.use('/coverageeligibility', coverageRouter);
router.use('/claim', claimRouter);

module.exports = router;
