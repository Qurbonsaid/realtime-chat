import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import {HttpException} from 'utils/exception'

import {NextFunction, Request, Response} from 'express'

export const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  try {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    const statusMsg = error.statusMsg || ReasonPhrases.INTERNAL_SERVER_ERROR
    const msg = error.msg || ReasonPhrases.GATEWAY_TIMEOUT

    return res.status(statusCode).send({
      status: {
        code: statusCode,
        msg: statusMsg,
      },
      msg,
    })
  } catch (err) {
    return next(err)
  }
}
