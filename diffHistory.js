const pick = require('lodash.pick');
const diffPatcher = require('jsondiffpatch').create();

const History = require('./diffHistoryModel').model;

const saveDiffObject = (currentObject, original, updated, user, reason) => {
  const diff = diffPatcher.diff(
    JSON.parse(JSON.stringify(original)),
    JSON.parse(JSON.stringify(updated))
  );

  if (!diff) return;

  const collectionId = currentObject._id;
  const collectionName = currentObject.constructor.modelName;

  return History.findOne({ collectionId, collectionName })
    .sort('-version')
    .then(lastHistory => {
      const history = new History({
        collectionId,
        collectionName,
        diff,
        user,
        reason,
        version: lastHistory ? lastHistory.version + 1 : 0 // TODO: bad logic
      });
      return history.save();
    });
};

const saveDiffHistory = (queryObject, currentObject) => {
  return currentObject.constructor.findOne({ _id: currentObject._id }).then(selfObject => {
    if (!selfObject) return;

    const updateParams = queryObject._update['$set'] || queryObject._update;
    const dbObject = pick(selfObject, Object.keys(updateParams));

    return saveDiffObject(
      currentObject,
      dbObject,
      updateParams,
      queryObject.options.__user,
      queryObject.options.__reason
    );
  });
};

const saveDiffs = queryObject =>
  queryObject
    .find(queryObject._conditions)
    .cursor()
    .eachAsync(result => saveDiffHistory(queryObject, result)); // TODO: Not sure if cursor available here, swap to mapSeries if not.

const getVersion = (model, id, version) => {
  return model.findOne({ _id: id }).then(latest => {
    return History.find(
      {
        collectionName: model.modelName,
        collectionId: id,
        version: { $gte: parseInt(version, 10) }
      },
      { diff: 1, version: 1 },
      { sort: '-version' }
    )
      .cursor()
      .eachAsync(history => {
        // TODO: Not sure if cursor available here, swap to mapSeries if not.
        const object = latest ? latest : {};
        return diffPatcher.unpatch(object, history.diff);
      });
  });
};

const getHistories = (modelName, id, expandableFields) => {
  return History.find({ collectionName: modelName, collectionId: id })
    .cursor()
    .eachAsync(history => {
      const changedValues = [];
      const changedFields = [];
      for (const key in history.diff) {
        if (history.diff.hasOwnProperty(key)) {
          if (expandableFields.indexOf(key) > -1) {
            const oldValue = history.diff[key][0];
            const newValue = history.diff[key][1];
            changedValues.push(key + ' from ' + oldValue + ' to ' + newValue);
          } else {
            changedFields.push(key);
          }
        }
      }
      const comment = 'modified ' + changedFields.concat(changedValues).join(', ');
      return {
        changedBy: history.user,
        changedAt: history.createdAt,
        updatedAt: history.updatedAt,
        reason: history.reason,
        comment: comment
      };
    });
};

const plugin = function lastModifiedPlugin(schema) {
  schema.pre('save', function(next) {
    if (this.isNew) return next();
    this.constructor
      .findOne({ _id: this._id })
      .then(original => saveDiffObject(this, original, this, this.__user, this.__reason))
      .then(() => next())
      .catch(next);
  });

  schema.pre('findOneAndUpdate', function(next) {
    saveDiffs(this)
      .then(() => next())
      .catch(next);
  });

  schema.pre('update', function(next) {
    saveDiffs(this)
      .then(() => next())
      .catch(next);
  });

  schema.pre('remove', function(next) {
    saveDiffObject(this, this, {}, this.__user, this.__reason)
      .then(() => next())
      .catch(next);
  });
};

module.exports = {
  plugin,
  getVersion,
  getHistories
};
