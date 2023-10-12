import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import helmet from 'helmet'
import contentSecurityPolicy from 'helmet-csp'
import {escapeHtml} from 'helpers/escape.helper'
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
import {auth} from './middlewares/auth.middleware'
import {errorMiddleware} from './middlewares/error.middleware'
import {Message} from './models/message.model'
import {Routes} from './routes'
import {HttpException} from './utils/exception'
import upload from './utils/file-upload'

const swaggerDocument = require('./swagger.json')

dotenv.config()

const app: Express = express()
const server = createServer(app)

const port = process.env.PORT || 5000

const onlineUsers: any = {}

if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', {recursive: true})
}

app.use(express.static(path.join(__dirname, '../public')))

app.use(cors())
app.use(bodyParser.json())

app.use(bodyParser.urlencoded({extended: true}))

CONNECT_DB()
  .then(() => console.warn('Connected DB'))
  .catch(err => {
    console.warn(err)
  })

app.use(
  contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: 'self',
      scriptSrc: 'self',
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      contentSecurityPolicy: "font-src 'self' data:",
      connectSrc: 'self',
    },
    reportOnly: false,
  }),
)
app.use(helmet())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get(ConstantAPI.ROOT, (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.redirect('/index.html')
  } catch (err: any) {
    return next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, ReasonPhrases.INTERNAL_SERVER_ERROR, err.message))
  }
})

Routes.forEach((controller: Controller) => {
  app.use(ConstantAPI.API + controller.path, controller.router)
})

const io = new Server(server, {
  path: '/api/chat',
  cors: {
    origin: process.env.FRONTEND_URL,
  },
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

app.post(ConstantAPI.API + '/upload', auth, upload.single('document'), (req: Request, res: Response) => {
  try {
    const uploadedFile = req.file
    if (!uploadedFile) {
      throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'File not provided!')
    }
    res.status(StatusCodes.OK).json({
      success: true,
      data: {document: '/uploads/documents/' + uploadedFile.filename, filename: uploadedFile.originalname},
    })
  } catch (error: any) {
    console.warn(error)
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error,
    })
  }
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

io.on('connection', socket => {
  const {
    user: {_id: userID, username},
    user,
  } = socket.data
  onlineUsers[username] = socket.id

  socket.on('getChats', async () => {
    const data = await Message.aggregate([
      {
        $match: {
          $or: [{sender: userID}, {receiver: userID}],
        },
      },
      {
        $lookup: {
          from: 'users',
          let: {sender: '$sender', receiver: '$receiver'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{$ne: ['$_id', userID]}, {$or: [{$eq: ['$_id', '$$sender']}, {$eq: ['$_id', '$$receiver']}]}],
                },
              },
            },
          ],
          as: 'chats',
        },
      },
      {
        $unwind: '$chats',
      },
      {
        $sort: {createdAt: -1},
      },
      {
        $group: {
          _id: {_id: '$chats._id', fullName: '$chats.fullName', username: '$chats.username'},
          unreadCount: {$sum: {$cond: [{$and: [{$eq: ['$sender', '$chats._id']}, {$eq: ['$read', false]}]}, 1, 0]}},
          lastMessage: {
            $first: {
              sender: {$cond: [{$eq: ['$chats._id', '$sender']}, '$chats.username', username]},
              text: '$text',
              createdAt: '$createdAt',
            },
          },
        },
      },
      {
        $project: {
          _id: '$_id._id',
          fullName: '$_id.fullName',
          username: '$_id.username',
          unreadCount: 1,
          lastMessage: 1,
        },
      },
      {
        $addFields: {
          online: {$in: ['$username', Object.keys(onlineUsers).filter(it => onlineUsers[it])]},
        },
      },
    ]).sort({['lastMessage.createdAt']: -1})
    data.forEach(chat => {
      if (onlineUsers[chat.username]) {
        io.to(onlineUsers[chat.username]).emit('userOnline', username)
      }
    })
    socket.emit('chats', data)
  })

  socket.on('message', async (receiverUsername, text) => {
    try {
      const receiver = await User.findOne({username: receiverUsername})
      if (!receiver) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      const message = new Message({
        sender: user._id,
        receiver: receiver._id,
        text: escapeHtml(text),
      })
      await message.save()

      if (onlineUsers[receiverUsername]) {
        message.read = true
        await message.save()
        io.to([onlineUsers[receiverUsername], onlineUsers[username]]).emit(
          'newMessage',
          await (await message.populate('sender', 'fullName username')).populate('receiver', 'fullName username'),
        )
      } else {
        socket.emit(
          'newMessage',
          await (await message.populate('sender', 'fullName username')).populate('receiver', 'fullName username'),
        )
      }
    } catch (error: any) {
      socket.emit('error', error)
    }
  })

  socket.on('document', async (receiverUsername, isImage, filename, url, captions) => {
    try {
      const receiver = await User.findOne({username: receiverUsername})
      if (!receiver) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      const message = new Message({
        sender: user._id,
        receiver: receiver._id,
        text:
          (isImage
            ? `<img src="${url}" title="${filename}" alt="${filename}">\n`
            : `<a href="${url}" download="${filename}">${filename}</a>\n`) + captions,
      })
      await message.save()

      if (onlineUsers[receiverUsername]) {
        message.read = true
        await message.save()
        io.to([onlineUsers[receiverUsername], onlineUsers[username]]).emit(
          'newMessage',
          await (await message.populate('sender', 'fullName username')).populate('receiver', 'fullName username'),
        )
      } else {
        socket.emit(
          'newMessage',
          await (await message.populate('sender', 'fullName username')).populate('receiver', 'fullName username'),
        )
      }
    } catch (error: any) {
      socket.emit('error', error)
    }
  })

  socket.on('getChat', async (chat: string) => {
    try {
      const chattingUser = await User.findOne({username: chat}).select('fullName username')
      if (!chattingUser) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      const allMessages = await Message.find(
        {
          $or: [
            {sender: chattingUser._id, receiver: userID},
            {sender: userID, receiver: chattingUser._id},
          ],
        },
        {sender: 1, read: 1, text: 1},
        {sort: {createdAt: 1}},
      ).populate('sender', 'fullName username')
      allMessages.forEach(async message => {
        if (message.sender._id.equals(chattingUser._id) && !message.read) {
          message.read = true
          await message.save()
        }
      })

      socket.emit('allMessages', allMessages, chattingUser)
    } catch (error) {
      socket.emit('error', error)
    }
  })

  socket.on('typing', (typingUser, receiver) => {
    if (onlineUsers[receiver]) {
      io.to(onlineUsers[receiver]).emit('typingEvent', typingUser)
    }
  })

  socket.on('disconnect', async () => {
    const data = await Message.aggregate([
      {
        $match: {
          $or: [{sender: userID}, {receiver: userID}],
        },
      },
      {
        $lookup: {
          from: 'users',
          let: {sender: '$sender', receiver: '$receiver'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{$ne: ['$_id', userID]}, {$or: [{$eq: ['$_id', '$$sender']}, {$eq: ['$_id', '$$receiver']}]}],
                },
              },
            },
          ],
          as: 'chats',
        },
      },
      {
        $unwind: '$chats',
      },
      {
        $sort: {createdAt: -1},
      },
      {
        $group: {
          _id: {_id: '$chats._id', fullName: '$chats.fullName', username: '$chats.username'},
          unreadCount: {$sum: {$cond: [{$and: [{$eq: ['$sender', '$chats._id']}, {$eq: ['$read', false]}]}, 1, 0]}},
          lastMessage: {
            $first: {
              sender: {$cond: [{$eq: ['$chats._id', '$sender']}, '$chats.username', username]},
              text: '$text',
              createdAt: '$createdAt',
            },
          },
        },
      },
      {
        $project: {
          _id: '$_id._id',
          fullName: '$_id.fullName',
          username: '$_id.username',
          unreadCount: 1,
          lastMessage: 1,
        },
      },
      {
        $addFields: {
          online: {$in: ['$username', Object.keys(onlineUsers).filter(it => onlineUsers[it])]},
        },
      },
    ]).sort({['lastMessage.createdAt']: -1})
    data.filter(it => it.online).forEach(chat => io.to(onlineUsers[chat.username]).emit('userOffline', username))
    onlineUsers[username] = undefined
  })
})

server.listen(port, () => {
  console.warn(`⚡️[server]: Server is running at http://localhost:${port}`)
})
