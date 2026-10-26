import mongoose from 'mongoose';

function describeDocumentStructure(value) {
  if (value === null) return 'null';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) {
    return value.length === 0
      ? 'array'
      : `array<${describeDocumentStructure(value[0])}>`;
  }
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return 'objectId';
    if (value._bsontype === 'Binary' || Buffer.isBuffer(value)) return 'binary';

    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [key, describeDocumentStructure(field)])
    );
  }
  return typeof value;
}

const mongoUri = process.env.MONGO_URI_READONLY || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI_READONLY ou MONGO_URI não está disponível no ambiente.');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const report = [];

    for (const { name } of collections) {
      const collection = db.collection(name);
      const [document, indexes] = await Promise.all([
        collection.findOne({}, { maxTimeMS: 5000 }),
        collection.indexes(),
      ]);

      report.push({
        name,
        documentStructure: document === null ? null : describeDocumentStructure(document),
        indexes: indexes.map(index => ({
          name: index.name,
          keys: index.key,
          unique: index.unique === true,
          sparse: index.sparse === true,
          expireAfterSeconds: index.expireAfterSeconds,
        })),
      });
    }

    console.log(JSON.stringify({ connected: true, collections: report }, null, 2));
  } catch {
    console.error('Falha na conexão ou consulta somente leitura; detalhes omitidos. Confira o Secret e as permissões no Atlas.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}
