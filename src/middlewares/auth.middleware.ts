import {JwtHelpers} from 'helpers/jwt.helper'
import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import {User} from 'models/user.model'
import {HttpException} from 'utils/exception'

import {NextFunction, Request, Response} from 'express'

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      throw new HttpException(StatusCodes.UNAUTHORIZED, ReasonPhrases.UNAUTHORIZED, 'Unauthorized!')
    }

    const decoded = JwtHelpers.verify(token)

    if (!decoded.id) {
      throw new HttpException(StatusCodes.UNAUTHORIZED, ReasonPhrases.UNAUTHORIZED, 'Unauthorized!')
    }

    const user = await User.findById(decoded.id)

    if (!user) {
      throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
    }

    req.body.user = user

    next()
  } catch (error: any) {
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error,
    })
  }
}
