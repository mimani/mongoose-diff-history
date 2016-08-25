var mongoose = require("mongoose");
var historySchema = new mongoose.Schema(
    {
        collectionName: {type: String},
        collectionId: {type: mongoose.Schema.Types.ObjectId},
        diff: {},
        user: {},
        reason: {type: String},
        version: {type: Number, min: 0}
    },
    {
        timestamps: true
    });

var History = mongoose.model("History", historySchema);
module.exports = History;