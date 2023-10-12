import fs from 'fs'
import {ReasonPhrases, StatusCodes} from 'http-status-codes'
import multer from 'multer'
import path from 'path'

import {HttpException} from './exception'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('./public/uploads/documents')) {
      fs.mkdirSync('./public/uploads/documents', {recursive: true})
    }
    if (file.fieldname === 'document') {
      cb(null, './public/uploads/documents')
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === 'document') {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
    }
  },
})

const checkFileType = (file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const filetypes =
    /jpg|jpeg|png|gif|bmp|tiff|doc|docx|pdf|ppt|pptx|xls|xlsx|csv|txt|mp3|wav|avi|mp4|mkv|mov|flv|zip|rar|7z|gz|tar|bz2/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)

  if (mimetype && extname) {
    cb(null, true)
  } else {
    cb(
      new HttpException(
        StatusCodes.UNPROCESSABLE_ENTITY,
        ReasonPhrases.UNPROCESSABLE_ENTITY,
        'You can only upload document and media files.',
      ),
    )
  }
}

const upload = multer({
  storage,
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb)
  },
})

export = upload
