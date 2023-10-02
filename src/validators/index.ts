import {validationResult} from 'express-validator'

import {NextFunction, Request, Response} from 'express'

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }

  const extractedErrors: {[x: string]: string}[] = []

  errors.array().map((err: any) => extractedErrors.push({[err.path]: err.msg}))
  return res.status(422).json({
    errors: extractedErrors,
  })
}
