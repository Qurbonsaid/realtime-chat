import {ConstantAPI} from 'constants/api.constant'
import {Controller} from 'controllers/controller.interface'

import {router as AuthRouter} from './auth.route'

export const Routes: Controller[] = [
  {
    path: ConstantAPI.AUTH,
    router: AuthRouter,
  },
]
