# mongoose-diff-history

This Library will store all the differences one collection goes through in it's lifecycle.

We will store diff of an object when it changes.

We will store a version along with the diff, this feature will be configurable.

Folowing will be the structure of the diff object being saved:


diff Collection schema:

 _id : mongo id of the diff object
 collectionName: Name of the collection for which diff is saved
 collectionId : Mongo Id of the collection being modified
 diff: diff object
 user: User who modified
 reason: Why the collection is modified
 createdAt: When the collection is modified
 _v: version

