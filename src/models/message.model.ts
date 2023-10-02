import {CollectionNames} from 'constants/db.constants'
import {Schema, model} from 'mongoose'

export const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: CollectionNames.USER,
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: CollectionNames.USER,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {timestamps: true},
)

export const Message = model(CollectionNames.MESSAGE, MessageSchema)
