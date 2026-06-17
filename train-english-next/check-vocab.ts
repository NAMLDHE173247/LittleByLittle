import mongoose from 'mongoose';
import { Vocabulary } from './src/lib/db/models/index.ts';
import dbConnect from './src/lib/db/connection';

async function run() {
  await dbConnect();
  const count = await Vocabulary.countDocuments();
  console.log('Total vocabulary:', count);
  mongoose.disconnect();
}
run();
