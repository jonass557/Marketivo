const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Connexion à MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    });
    console.log(`MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur MongoDB: ${error.message}`);
    console.error('URI utilisée:', process.env.MONGODB_URI?.substring(0, 30) + '...');
    process.exit(1);
  }
};

module.exports = connectDB;
