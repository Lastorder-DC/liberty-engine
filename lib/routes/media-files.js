'use strict';

const path = require('path');
const { promisify } = require('util');
const express = require('express');

const router = express.Router();

const uuidV4 = require('uuid/v4');
const multer = require('multer');
const Response = require('../responses');
const { UnauthorizedError } = require('../errors');

const fs = require('fs');

const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);

const {
  sequelize,
  Article,
  Namespace,
  MediaFile,
} = require('../models');

const mediaPath = path.join(__dirname, '..', '..', 'media');
const tempPath = path.join(__dirname, '..', '..', 'media', 'temp');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, tempPath);
  },

  filename(req, file, cb) {
    cb(null, `${uuidV4()}.${file.mimetype.split('/')[1]}`);
  },
});

const upload = multer({ storage });

router.post('/',
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!await req.user.isCreatable(Namespace.FILE)) {
        throw new UnauthorizedError();
      }
      await sequelize.transaction(async (transaction) => {
        const article = await Article.createNew({
          ipAddress: req.ipAddress,
          fullTitle: Namespace.joinNamespaceIdTitle(Namespace.FILE.id, req.body.filename),
          author: req.user,
          wikitext: req.body.wikitext,
          summary: req.body.summary,
          transaction,
        });
        await MediaFile.create({
          descriptionArticleId: article.id,
          filename: req.file.filename,
        }, { transaction });
        await renameAsync(req.file.path, path.join(mediaPath, req.file.filename));
      });
      return new Response.Success().send(res);
    } catch (err) {
      fs.stat(req.file.path, async (err) => {
        if (!err) { // temp file exists
          await unlinkAsync(req.file.path);
        }
      });
      return next(err);
    }
  }
);

module.exports = router;