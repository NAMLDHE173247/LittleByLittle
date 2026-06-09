const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/littlebylittle');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(collections.map(c => c.name));
  
  const items = await mongoose.connection.db.collection('userwordprogresses').find({}).toArray();
  console.log('userwordprogresses count:', items.length);

  mongoose.disconnect();
}
check();
