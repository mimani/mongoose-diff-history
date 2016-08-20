[![Build Status](https://travis-ci.org/mimani/mongoose-diff-history.svg?branch=master)](https://travis-ci.org/mimani/mongoose-diff-history)
[![Codacy](https://api.codacy.com/project/badge/grade/bf1936538af048ac8d104a6c2ecd71ca)](https://www.codacy.com/app/mimani-saurabh/mongoose-diff-history)
[![Codacy](https://api.codacy.com/project/badge/coverage/bf1936538af048ac8d104a6c2ecd71ca)](https://www.codacy.com/app/mimani-saurabh/mongoose-diff-history)

mongoose-diff-history
=============

Stores and Manages all the differences any Mongo collection goes through it's lifecycle.

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
diffHistory.getHistories(modelName, ObjectId, <expandable fields>, function (err, histories) {

}
```

## Example
---------------
I have created an [example](https://github.com/mimani/mongoose-diff-history/tree/master/example) express service, demonstrating this plugin via an simple employee schema, checkout `example` directory in this repo.

## TODO
---------------
- Store a version along with the diff, this feature will be configurable.
- instance methods to fetch an older version of object