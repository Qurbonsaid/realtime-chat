import pkg from 'jsonwebtoken'

import {Bcrypt} from './hashing.helper'

const {sign: jwtSign, verify: jwtVerify} = pkg as unknown as Bcrypt

export class JwtHelpers {
  public static sign(payload: any): string {
    return jwtSign({id: payload.id}, process.env.JWT_SECRET, {expiresIn: '1d'})
  }
  public static signRefresh(payload: string): string {
    return jwtSign({id: payload}, process.env.JWT_SECRET_REFRESH, {expiresIn: '7d'})
  }
  public static verify(token: string): any {
    return jwtVerify(token, process.env.JWT_SECRET)
  }
  public static verifyRefresh(token: string): any {
    return jwtVerify(token, process.env.JWT_SECRET_REFRESH)
  }
}
