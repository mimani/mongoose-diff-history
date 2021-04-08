const mongoose = require('mongoose');
const { Schema } = mongoose;

const historySchemaGenerator = (paths, opts) =>
    new Schema(
        {
            collectionName: String,
            collectionId: {
                type: paths?._id?.options?.type || Schema.Types.ObjectId
            },
            diff: {},
            user: {},
            reason: String,
            version: { type: Number, min: 0 }
        },
        {
            timestamps: true,
            ...opts
        }
    );

const historyModelGenerator = (schema, opts = {}) => {
    let model;
    try {
        model = mongoose.model(`${opts.name}`);
        console.log(`Model [${opts.name}] already exists`);
    } catch (e) {
        model = mongoose.model(
            `${opts.name}`,
            historySchemaGenerator(schema.paths, opts.schemaOpts)
        );
        console.log(`Creating model [${opts.name}]`);
    }
    return model;
};

module.exports = historyModelGenerator;
