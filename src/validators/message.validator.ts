import {body, query} from 'express-validator'

export const sendV = () => [
  body('username', 'Please enter username!').notEmpty().isAlpha('en-US').isLength({min: 3}),
  body('text', 'Please enter message!').notEmpty(),
]

export const getChatV = () => [
  query('username', 'Please enter username!').notEmpty().isAlpha('en-US').isLength({min: 3}),
]
