import {CollectionNames} from 'constants/db.constants'
import {Schema, model} from 'mongoose'

export const UserSchema = new Schema({
  fullName: {type: String, required: true},
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  refreshToken: {type: String, select: false},
})

export const User = model(CollectionNames.USER, UserSchema)
