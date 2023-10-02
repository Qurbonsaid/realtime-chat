import {AuthController} from 'controllers/auth.controller'
import {auth} from 'middlewares/auth.middleware'
import {loginV, registerV} from 'validators/auth.validator'

import {Router} from 'express'

import {validate} from '../validators'

export const router = Router()

/**
 * @api {post} /auth/login
 * @apiName Login
 * @apiBody username,password
 * @apiGroup Auth
 * @apiSuccess (200) {Object}
 */
router.post('/login', loginV(), validate, AuthController.login)

/**
 * @api {post} /auth/register
 * @apiName Register
 * @apiBody username,password,fullName
 * @apiGroup Auth
 * @apiSuccess (201) {Object}
 */
router.post('/register', registerV(), validate, AuthController.register)

/**
 * @api {post} /auth/refresh-token
 * @apiName Refresh token
 * @apiGroup Auth
 * @apiSuccess (200) {Object}
 */
router.post('/refresh-token', AuthController.refresh)

/**
 * @api {get} /auth/me
 * @apiName Get data user
 * @apiGroup Auth
 * @apiSuccess (200) {Object}
 */
router.get('/me', auth, AuthController.me)
