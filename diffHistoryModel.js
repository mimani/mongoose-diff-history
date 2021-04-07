const mongoose = require('mongoose');
const { Schema } = mongoose;

const historySchemaGenerator = (paths, opts) =>
    new Schema(
        {
            collectionName: String,
            collectionId: { type: paths._id?.type || Schema.Types.ObjectId },
            diff: {},
            user: {},
            reason: String,
            version: { type: Number, min: 0 }
        },
        {
            timestamps: true
        }
    );

const historyModelGenerator = (schema, opts) => ({
    model: mongoose.model(
        `${opts.name}`,
        historySchemaGenerator(schema.paths, opts)
    )
});

module.exports = historyModelGenerator;
