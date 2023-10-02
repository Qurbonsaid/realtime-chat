import {body} from 'express-validator'

export const loginV = () => [
  body('username', 'Please enter username!').notEmpty().isAlpha('en-US').isLength({min: 3}),
  body('password', 'Please enter password!').notEmpty().isAlphanumeric('en-US').isLength({min: 6}),
]

export const registerV = () => [
  body('fullName', 'Please enter full name!').notEmpty().isLength({min: 3}),
  body('username', 'Please enter username!').notEmpty().isAlpha('en-US').isLength({min: 3}),
  body('password', 'Please enter password!').notEmpty().isAlphanumeric('en-US').isLength({min: 6}),
]
