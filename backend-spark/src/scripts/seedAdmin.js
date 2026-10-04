/**
 * Seed script: Register one admin user (hardcoded).
 * Password is hashed with bcrypt via Admin model pre-save hook.
 * Run from backend folder: node src/scripts/seedAdmin.js
 */
require("dotenv").config();
const connectDB = require("../config/db");
const Admin = require("../models/admin.model");

const ADMIN_EMAIL = "santoshkumarsharmabagda@gmail.com";
const ADMIN_PASSWORD = "Ram@12345";
const ADMIN_NAME = "Admin";

const seedAdmin = async () => {
  try {
    await connectDB();

    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log("⚠️  Admin already exists with this email. Skipping seed.");
      process.exit(0);
      return;
    }

    await Admin.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    console.log("✅ Admin registered successfully (password stored with bcrypt).");
    console.log("   Email:", ADMIN_EMAIL);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Admin Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
