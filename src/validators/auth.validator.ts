import {body} from 'express-validator'

export const loginV = () => [
  body('username', 'Please enter username!').notEmpty(),
  body('password', 'Please enter password!').notEmpty(),
]

export const registerV = () => [
  body('fullName', 'Please enter full name!').notEmpty(),
  body('username', 'Please enter username!').notEmpty(),
  body('password', 'Please enter password!').notEmpty(),
]
