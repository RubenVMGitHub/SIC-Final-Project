const router = require('express').Router();
const userController = require('../controllers/user.controller');

router.post('/', userController.register);
router.post('/login', userController.login);
router.get('/me', userController.me);

module.exports = router;
