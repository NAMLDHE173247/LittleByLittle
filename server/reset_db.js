const mongoose = require('mongoose');

async function reset() {
  await mongoose.connect('mongodb://localhost:27017/littlebylittle');
  console.log('Connected');
  await mongoose.connection.db.collection('userwordprogresses').deleteMany({});
  console.log('Progress data cleared');
  mongoose.disconnect();
}

reset();
