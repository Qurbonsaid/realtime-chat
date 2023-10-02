import {HashingHelpers} from 'helpers/hashing.helper'
import {JwtHelpers} from 'helpers/jwt.helper'
import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import {User} from 'models/user.model'
import {HttpException} from 'utils/exception'

import {Request, Response} from 'express'

export class AuthController {
  public static async login(req: Request, res: Response) {
    try {
      const {username, password} = req.body
      const user = await User.findOne({username}).select('+password')
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found or password incorrect!')
      }
      const isMatch = await HashingHelpers.comparePassword(password as string, user.password)
      if (!isMatch) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found or password incorrect!')
      }
      const accessToken = JwtHelpers.sign({id: user._id.toString()})
      user.refreshToken = JwtHelpers.signRefresh(user._id.toString())
      await user.save()
      res.status(StatusCodes.OK).json({
        success: true,
        data: user,
        token: accessToken,
        refreshToken: user.refreshToken,
      })
    } catch (error: any) {
      res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error,
      })
    }
  }
  public static async register(req: Request, res: Response) {
    try {
      const {fullName, username} = req.body
      const password = await HashingHelpers.generatePassword(req.body.password as string)
      const data = await User.create({fullName, username, password})
      return res.status(StatusCodes.CREATED).json({
        success: true,
        data,
      })
    } catch (error: any) {
      return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error,
      })
    }
  }
  public static async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.headers.authorization?.split(' ')[1]

      if (!refreshToken) {
        throw new HttpException(StatusCodes.FORBIDDEN, ReasonPhrases.FORBIDDEN, 'Forbidden!')
      }

      const user = await User.findOne({refreshToken})

      if (!user) {
        throw new HttpException(StatusCodes.FORBIDDEN, ReasonPhrases.FORBIDDEN, 'Forbidden!')
      }

      const decoded = JwtHelpers.verifyRefresh(refreshToken)

      if (!decoded.id) {
        throw new HttpException(StatusCodes.FORBIDDEN, ReasonPhrases.FORBIDDEN, 'Forbidden!')
      }

      const accessToken = JwtHelpers.sign({id: user._id.toString()})

      return res.status(StatusCodes.OK).json({token: accessToken})
    } catch (error: any) {
      return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error,
      })
    }
  }
  public static me(req: Request, res: Response) {
    try {
      const {user} = req.body
      return res.status(StatusCodes.OK).json({
        success: true,
        data: user,
      })
    } catch (error: any) {
      return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error,
      })
    }
  }
}
