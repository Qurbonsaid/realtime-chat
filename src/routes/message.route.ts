import {MessageController} from 'controllers/message.controller'
import {auth} from 'middlewares/auth.middleware'
import {getChatV} from 'validators/message.validator'

import {Router} from 'express'

import {validate} from '../validators'

export const router = Router()

/**
 * @api {get} /message/chats
 * @apiName Get all chats
 * @apiGroup Message
 * @apiSuccess 200 [{Object}]
 */
router.get('/chats', auth, MessageController.getChats)

/**
 * @api {get} /message/all
 * @apiName Get all messages from chat
 * @apiQuery username
 * @apiGroup Message
 * @apiSuccess 200 [{Object}]
 */
router.get('/all', auth, getChatV(), validate, MessageController.getChat)
