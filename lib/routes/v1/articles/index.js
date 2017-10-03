'use strict';

const express = require('express');
const { UnauthorizedError } = require('../../../errors');

const router = express.Router({ mergeParams: true });

const {
  Article,
  Namespace,
  Revision,
} = require('../../../models');

const Response = require('../../../responses');

router.get('/',
  async (req, res, next) => {
    let limit = Number(req.query.limit);
    if (!limit) {
      limit = 10;
    }
    if (limit > 100) {
      return new Response.BadRequest().send(res);
    }
    let articles;
    try {
      if (req.query.random === 'true' || req.query.random === '1') {
        articles = await Article.findRandomly({ limit });
      } else {
        articles = await Article.findAll({ limit });
      }
      return new Response.Success({ articles }).send(res);
    } catch (err) {
      return next(err);
    }
  }
);

router.post('/',
  async (req, res, next) => {
    try {
      if (!await req.user.isCreatable(Namespace.splitFullTitle(req.body.fullTitle).namespace)) {
        throw new UnauthorizedError();
      }
      await Article.createNew({
        ipAddress: req.ipAddress,
        fullTitle: req.body.fullTitle,
        author: req.user,
        wikitext: req.body.wikitext,
        summary: req.body.summary,
      });
      new Response.Created().send(res);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:fullTitle',
  async (req, res, next) => {
    try {
      console.log(req.params.fullTitle);
      const fields = req.query.fields ? req.query.fields.split(',') : ['namespaceId', 'title', 'updatedAt'];
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      if (!await req.user.isReadable(article)) {
        throw new UnauthorizedError();
      }
      const result = {};
      const promises = [];
      if (fields.includes('revisions')) {
        promises.push(
          (async () => {
            const revisions = await article.getRevisions({
              include: [Revision.associations.author],
              order: [['id', 'DESC']],
            });
            result.revisions = revisions.map(revision => ({
              id: revision.id,
              changedLength: revision.changedLength,
              createdAt: revision.createdAt,
              summary: revision.summary,
              authorName: revision.author ? revision.author.username : null,
              ipAddress: revision.author ? null : revision.ipAddress,
            }));
          })()
        );
      }
      if (fields.includes('discussionTopics')) {
        promises.push(
          (async () => {
            const discussionTopics = await article.getDiscussionTopics({
              order: [['id', 'DESC']],
            });
            result.discussionTopics = await Promise.all(discussionTopics.map(async (topic) => {
              const firstComment = await topic.getFirstComment();
              return {
                id: topic.id,
                title: topic.title,
                createdAt: topic.createdAt,
                updatedAt: topic.updatedAt,
                firstComment: await firstComment.getPublicObject(),
              };
            }));
          })()
        );
      }
      if (fields.includes('id')) {
        result.id = article.id;
      }
      if (fields.includes('namespaceId')) {
        result.namespaceId = article.namespaceId;
      }
      if (fields.includes('title')) {
        result.title = article.title;
      }
      if (fields.includes('updatedAt')) {
        result.updatedAt = article.updatedAt;
      }
      if (fields.includes('fullTitle')) {
        result.fullTitle = article.fullTitle;
      }
      if (fields.includes('latestRevisionId')) {
        result.latestRevisionId = article.latestRevisionId;
      }
      if (fields.includes('allowedActions')) {
        promises.push(article.getAllowedActions(req.user).then((allowedActions) => {
          result.allowedActions = allowedActions;
        }));
      }
      if (fields.includes('redirections')) {
        promises.push(article.getRedirections().then((redirections) => {
          result.redirections = redirections;
        }));
      }
      if (fields.includes('wikitext')) {
        promises.push(
          article.getLatestRevision({ includeWikitext: true })
            .then((revision) => {
              result.wikitext = revision.wikitext.text;
            })
        );
      }
      if (fields.includes('html')) {
        promises.push(
          article.render()
            .then((renderResult) => {
              result.html = renderResult.html;
            })
        );
      }
      await Promise.all(promises);
      return new Response.Success({ article: result }).send(res);
    } catch (err) {
      return next(err);
    }
  }
);

/* rename article */
router.put('/:fullTitle/full-title',
  async (req, res, next) => {
    try {
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      if (!await req.user.isRenamable(article)) {
        throw new UnauthorizedError();
      }
      if (req.params.fullTitle === req.body.fullTitle) {
        return new Response.BadRequest({ name: 'NoChangeError', message: 'No change' }).send(res);
      }
      await article.rename({
        ipAddress: req.ipAddress,
        author: req.user,
        newFullTitle: req.body.fullTitle,
        summary: req.body.summary,
      });
      return new Response.Success().send(res);
    } catch (err) {
      return next(err);
    }
  }
);

/* edit article */
router.put('/:fullTitle/wikitext',
  async (req, res, next) => {
    try {
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      if (!await req.user.isEditable(article)) {
        throw new UnauthorizedError();
      }
      const latestRevision = await article.getLatestRevision({ includeWikitext: true });
      if (!req.body.latestRevisionId || latestRevision.id > req.body.latestRevisionId) {
        return new Response.BadRequest({ name: 'EditConflictError', message: 'edit conflict' }).send(res);
      }
      if (req.body.wikitext === latestRevision.wikitext.text) {
        return new Response.BadRequest({ name: 'NoChangeError', message: 'No change' }).send(res);
      }
      await article.edit({
        ipAddress: req.ipAddress,
        author: req.user,
        wikitext: req.body.wikitext,
        summary: req.body.summary,
      });
      return new Response.Success().send(res);
    } catch (err) {
      return next(err);
    }
  }
);

/* delete article */
router.delete('/:fullTitle',
  async (req, res, next) => {
    try {
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      if (!await req.user.isDeletable(article)) {
        throw new UnauthorizedError();
      }
      await article.delete({
        ipAddress: req.ipAddress,
        author: req.user,
        summary: req.body.summary,
      });
      return new Response.Success().send(res);
    } catch (err) {
      return next(err);
    }
  }
);

router.post('/:fullTitle/redirections',
  async (req, res, next) => {
    try {
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      await article.addNewRedirection({
        ipAddress: req.ipAddress,
        fullTitle: req.body.fullTitle,
        user: req.user,
      });
      return new Response.Created().send(res);
    } catch (err) {
      return next(err);
    }
  }
);

router.delete('/:fullTitle/redirections',
  async (req, res, next) => {
    try {
      const article = await Article.findByFullTitle(req.params.fullTitle);
      if (!article) {
        return new Response.ResourceNotFound().send(res);
      }
      await article.deleteRedirection({
        ipAddress: req.ipAddress,
        fullTitle: req.query.to,
        user: req.user,
      });
      return new Response.Created().send(res);
    } catch (err) {
      return next(err);
    }
  }
);

const discussionTopicsRouter = require('./discussion-topics');

router.use('/:fullTitle/discussion-topics', discussionTopicsRouter);

module.exports = router;