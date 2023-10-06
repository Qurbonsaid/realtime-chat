import {query} from 'express-validator'

export const getChatV = () => [
  query('username', 'Please enter username!').notEmpty().isAlpha('en-US').isLength({min: 3}),
]
