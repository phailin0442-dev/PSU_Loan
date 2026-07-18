import bcrypt from "bcryptjs";

const password = "123456";

const hash = await bcrypt.hash(password, 10);

console.log("Password:", password);
console.log("Hash:", hash);