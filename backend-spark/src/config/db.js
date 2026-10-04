const mongoose = require("mongoose");

/**
 * Older deployments created `phone_1` on students as a plain unique (sparse)
 * index. Every phone-less student stores phone: null, so after the first one
 * each signup failed with "A student with this phone already exists".
 * Mongoose never replaces an existing index whose options changed, so drop
 * the stale one and build the partial index from the schema.
 */
const fixStudentPhoneIndex = async (connection) => {
  try {
    const students = connection.db.collection("students");
    const indexes = await students.indexes().catch(() => []);
    const stale = indexes.find(
      (ix) =>
        ix.key && ix.key.phone === 1 && ix.unique && !ix.partialFilterExpression
    );
    if (stale) {
      await students.dropIndex(stale.name);
      console.log(`🛠️  Dropped stale student index: ${stale.name}`);
    }
    await require("../models/student.model").createIndexes();
  } catch (error) {
    console.error(`⚠️  Student phone index fix failed: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    await fixStudentPhoneIndex(conn.connection);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB Disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error(`❌ MongoDB Error: ${err.message}`);
});

module.exports = connectDB;

