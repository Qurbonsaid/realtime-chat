import {connect} from 'mongoose'

export const CONNECT_DB = async () => {
  try {
    await connect(process.env.DB_URL as string)
  } catch (err) {
    console.warn(err)
  }
}
