import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import {Message} from 'models/message.model'
import {User} from 'models/user.model'
import {HttpException} from 'utils/exception'

import {Request, Response} from 'express'

export class MessageController {
  public static async sendMessage(req: Request, res: Response) {
    try {
      const {
        username,
        text,
        user: {_id: sender},
      } = req.body
      const receiver = await User.findOne({username})
      if (!receiver) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      const data = await Message.create({sender, receiver: receiver._id, text})
      res.status(StatusCodes.CREATED).json({
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

  public static async getChats(req: Request, res: Response) {
    try {
      const {
        user: {_id: userID, username},
      } = req.body
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
                    $and: [
                      {$ne: ['$_id', userID]},
                      {$or: [{$eq: ['$_id', '$$sender']}, {$eq: ['$_id', '$$receiver']}]},
                    ],
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
              $first: {sender: {$cond: [{$eq: ['$chats._id', '$sender']}, '$chats.username', username]}, text: '$text'},
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
      ])
      res.status(StatusCodes.OK).json({
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

  public static async getChat(req: Request, res: Response) {
    try {
      const {username} = req.query
      const user = await User.findOne({username})
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, 'User not found!')
      }
      const data = await Message.find(
        {
          $or: [
            {sender: user._id, receiver: req.body.user._id},
            {sender: req.body.user._id, receiver: user._id},
          ],
        },
        {sender: 1, read: 1, text: 1},
        {sort: {createdAt: 1}},
      ).populate('sender', 'fullName username')
      data.forEach(async message => {
        if (message.sender.equals(user._id) && !message.read) {
          message.read = true
          await message.save()
        }
      })
      res.status(StatusCodes.OK).json({
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
}
