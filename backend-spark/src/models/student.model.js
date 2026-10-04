const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Student model – for student app registration & login.
 * Flow: email → send OTP → verify OTP → name + password → account created.
 */
const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: true, // Set true after OTP verification during registration
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
      description: "Optional; editable in profile",
    },
    avatar: {
      type: String,
      default: null,
      description: "Profile image URL (e.g. S3)",
    },
  },
  {
    timestamps: true,
  }
);

// Unique phone when set.
// `sparse` only skips documents where the field is ABSENT — but `phone` has
// `default: null`, so every student carries phone: null and gets indexed.
// Under a unique index that lets exactly one phone-less student exist and
// fails every later signup with a duplicate-key error. A partial index keyed
// on the type actually skips the nulls.
studentSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);

// ─── Hash password before saving ───
studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Compare password method ───
studentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Remove sensitive fields from JSON ───
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
