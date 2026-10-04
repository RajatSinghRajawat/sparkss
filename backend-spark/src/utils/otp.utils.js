/**
 * Generate a random numeric OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};

module.exports = { generateOTP };

