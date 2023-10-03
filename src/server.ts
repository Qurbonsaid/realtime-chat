import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import swaggerUi from 'swagger-ui-express'

import express, {Express, NextFunction, Request, Response} from 'express'

import {CONNECT_DB} from './config/database.config'
import {ConstantAPI} from './constants/api.constant'
import {Controller} from './controllers/controller.interface'
import {errorMiddleware} from './middlewares/error.middleware'
import {Routes} from './routes'
import {HttpException} from './utils/exception'

const swaggerDocument = require('./swagger.json')

dotenv.config()

const app: Express = express()
const port = process.env.PORT || 5000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
CONNECT_DB()
  .then(() => console.warn('Connected DB'))
  .catch(err => {
    console.warn(err)
  })
app.get(ConstantAPI.ROOT, (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(StatusCodes.OK).json({
      status: {
        code: StatusCodes.OK,
        msg: StatusCodes.OK,
      },
      msg: ReasonPhrases.OK,
    })
  } catch (err: any) {
    return next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, ReasonPhrases.INTERNAL_SERVER_ERROR, err.message))
  }
})
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
Routes.forEach((controller: Controller) => {
  app.use(ConstantAPI.API + controller.path, controller.router)
})
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  const err = {
    success: false,
    statusCode: StatusCodes.NOT_FOUND,
    statusMsg: ReasonPhrases.NOT_FOUND,
    msg: 'Not found!',
  }
  next(err)
})
app.use(errorMiddleware)
app.listen(port, () => {
  console.warn(`⚡️[server]: Server is running at http://localhost:${port}`)
})
