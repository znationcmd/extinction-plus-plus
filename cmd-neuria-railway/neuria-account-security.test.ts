import {validateEmail,validatePassword,hashPassword,verifyPassword,newSessionToken,hashSessionToken} from "./neuria-account-security.ts";
import {test,expect} from "bun:test";
test("validates and normalizes email",()=>{
 expect(validateEmail("  Test@Example.COM ")).toBe("test@example.com");
 expect(()=>validateEmail("invalid")).toThrow();
});
test("enforces strong minimum password length",()=>{
 expect(()=>validatePassword("123456")).toThrow();
 expect(validatePassword("phrase-longue-et-sure")).toBe("phrase-longue-et-sure");
});
test("password hash and verification",async()=>{
 const record=await hashPassword("phrase-longue-et-sure");
 expect(record.password_hash).not.toContain("phrase");
 expect(await verifyPassword("phrase-longue-et-sure",record)).toBe(true);
 expect(await verifyPassword("mauvaise-phrase",record)).toBe(false);
});
test("session token hashing",async()=>{
 const token=newSessionToken();
 expect(token).toMatch(/^[0-9a-f]{64}$/);
 expect(await hashSessionToken(token)).not.toBe(token);
 expect(newSessionToken()).not.toBe(token);
});
