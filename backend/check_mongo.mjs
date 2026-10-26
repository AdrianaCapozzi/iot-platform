import 'dotenv/config';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI não configurada. Defina-a pelo gerenciador de Secrets do ambiente.');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Conectado ao MongoDB Atlas');
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  console.log('\n📚 Collections no MongoDB:');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  📊 ${col.name}: ${count} documentos`);
  }
  
  // Verificar sensorReadings especificamente
  console.log('\n🔍 Detalhes SensorReadings:');
  const readings = db.collection('sensorreadings');
  const count = await readings.countDocuments();
  console.log(`  Total: ${count} leituras`);
  
  if (count > 0) {
    const sample = await readings.findOne();
    console.log('\n  Amostra de sensor:');
    console.log(`    ID: ${sample.sensorId}`);
    console.log(`    Fonte: ${sample.source}`);
    console.log(`    Cidade: ${sample.location?.city || 'Não geocodificada'}`);
    console.log(`    PM2.5: ${sample.measurements?.pm25 || 'N/A'}`);
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Verificação concluída');
} catch (err) {
  // Evita que mensagens do driver imprimam detalhes da conexão.
  console.error('❌ Falha ao verificar o MongoDB. Confira a configuração de rede e credenciais no Atlas.');
} finally {
  await mongoose.disconnect().catch(() => {});
}
