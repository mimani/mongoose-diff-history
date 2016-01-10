var mongoose = require('mongoose');
var historySchema = new mongoose.Schema(
    {
        created_at: {type: Date, default: Date.now()},
        collectionName: {type: String},
        collectionId: {type: mongoose.Schema.Types.ObjectId},
        diff: {},
        user: {type: String},
        reason: {type: String},
    });
var History = mongoose.model('History', historySchema);
module.exports = History;