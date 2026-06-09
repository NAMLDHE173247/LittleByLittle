const mongoose = require('mongoose');
const { Schema } = mongoose;

async function check() {
  await mongoose.connect('mongodb://localhost:27017/littlebylittle');
  const items = await mongoose.connection.db.collection('userwordprogresses').find({}).toArray();
  console.log("DB items count:", items.length);
  if (items.length > 0) {
    console.log(JSON.stringify(items[0], null, 2));
  }
  mongoose.disconnect();
}
check();
