import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import {JwtHelpers} from 'helpers/jwt.helper'
import {createServer} from 'http'
import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import {User} from 'models/user.model'
import path from 'path'
import {Server} from 'socket.io'
import swaggerUi from 'swagger-ui-express'

import express, {Express, NextFunction, Request, Response} from 'express'

import {CONNECT_DB} from './config/database.config'
import {ConstantAPI} from './constants/api.constant'
import {Controller} from './controllers/controller.interface'
import {errorMiddleware} from './middlewares/error.middleware'
import {Message} from './models/message.model'
import {Routes} from './routes'
import {HttpException} from './utils/exception'

const swaggerDocument = require('./swagger.json')

dotenv.config()

const app: Express = express()
const server = createServer(app)

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
    return res.redirect('/index.html')
  } catch (err: any) {
    return next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, ReasonPhrases.INTERNAL_SERVER_ERROR, err.message))
  }
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use(express.static(path.join(__dirname, '../client')))

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

const io = new Server(server, {
  path: '/api/message/send',
})

io.use(async (socket, next) => {
  try {
    let token

    if (socket.handshake.auth) {
      token = socket.handshake.auth.token as string
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

    socket.data.user = user
    next()
  } catch (error: any) {
    io.emit('error', error)
  }
})

io.sockets.on('connection', socket => {
  socket.on('message', async (username, text) => {
    try {
      const {user} = socket.data
      const receiver = await User.findOne({username})
      if (!receiver) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      await Message.updateMany({sender: receiver._id, receiver: user._id, read: false}, {$set: {read: true}})
      const message = new Message({
        sender: user._id,
        receiver: receiver._id,
        text,
      })
      await message.save()
      io.emit(
        'message',
        await (await message.populate('sender', 'fullName username')).populate('receiver', 'fullName username'),
      )
    } catch (error: any) {
      io.emit('error', error)
    }
  })
})

server.listen(port, () => {
  console.warn(`⚡️[server]: Server is running at http://localhost:${port}`)
})
