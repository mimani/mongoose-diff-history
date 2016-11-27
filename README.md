[![Build Status](https://travis-ci.org/mimani/mongoose-diff-history.svg?branch=master)](https://travis-ci.org/mimani/mongoose-diff-history)
[![Downloads](https://img.shields.io/npm/dt/mongoose-diff-history.svg)](https://www.npmjs.com/package/mongoose-diff-history)
[![Codacy](https://api.codacy.com/project/badge/grade/bf1936538af048ac8d104a6c2ecd71ca)](https://www.codacy.com/app/mimani-saurabh/mongoose-diff-history)
[![Code Climate](https://codeclimate.com/github/mimani/mongoose-diff-history/badges/gpa.svg)](https://codeclimate.com/github/mimani/mongoose-diff-history)
[![Test Coverage](https://codeclimate.com/github/mimani/mongoose-diff-history/badges/coverage.svg)](https://codeclimate.com/github/mimani/mongoose-diff-history/coverage)

mongoose-diff-history
=============

Stores and Manages all the differences and versions, any Mongo collection goes through it's lifecycle.

## Installation
---------------
###npm
``` sh
npm install mongoose-diff-history
```

## Operation
---------------
Each update will create a history record with [jsonDiff](https://github.com/benjamine/jsondiffpatch) of the change. This helps in tracking all the changes happened to an object from the beginning.

Following will be the structure of the diff history being saved:


diff Collection schema:

```
_id : mongo id of the diff object
collectionName: Name of the collection for which diff is saved
collectionId : Mongo Id of the collection being modified
diff: diff object
user: User who modified
reason: Why the collection is modified
createdAt: When the collection is modified
_v: version
```

## Usage
---------------
Use as you would any Mongoose plugin:

``` js
var mongoose = require('mongoose'),
    diffHistory = require('mongoose-diff-history/diffHistory'),
    schema = new mongoose.Schema({ ... });
    schema.plugin(diffHistory.plugin);
```


## Helper Methods
---------------
You can get all the histories created for an object using following method:

``` js
var diffHistory = require('mongoose-diff-history/diffHistory');
diffHistory.getHistories(modelName, ObjectId, <expandable fields>, function (err, histories) {

}
```

You can get an older version of the object using following method:
``` js
var diffHistory = require('mongoose-diff-history/diffHistory');
diffHistory.getVersion(mongooseModel, ObjectId, version, function (err, oldObject) {

}
```



## Example
---------------
I have created an [example](https://github.com/mimani/mongoose-diff-history/tree/master/example) express service (documentation [here](https://github.com/mimani/mongoose-diff-history/blob/master/example/README.md)), demonstrating this plugin via an simple employee schema, checkout `example` directory in this repo.
