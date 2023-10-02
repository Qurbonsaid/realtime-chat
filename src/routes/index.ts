import {ConstantAPI} from 'constants/api.constant'
import {Controller} from 'controllers/controller.interface'

import {router as AuthRouter} from './auth.route'
import {router as MessageRouter} from './message.route'

export const Routes: Controller[] = [
  {
    path: ConstantAPI.AUTH,
    router: AuthRouter,
  },
  {
    path: ConstantAPI.MESSAGE,
    router: MessageRouter,
  },
]
