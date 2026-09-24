import crypto from "node:crypto";
import readline from "node:readline/promises";

const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const password=await rl.question("Admin password (minimum 8 chars): ");
rl.close();
if(password.length<8) throw new Error("Password must be at least 8 characters.");
const iterations=210000;
const salt=crypto.randomBytes(16);
const derived=crypto.pbkdf2Sync(password,salt,iterations,32,"sha256");
console.log("pbkdf2$"+iterations+"$"+salt.toString("base64url")+"$"+derived.toString("base64url"));
console.log("\nSet the resulting value as the Cloudflare Worker secret: ADMIN_PASSWORD_HASH");
