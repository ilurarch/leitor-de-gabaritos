import assert from 'node:assert/strict';
import {checkMaster,checkPassword,passwordHash} from '../password-access.js';
assert(checkMaster('SME26'));assert(!checkMaster('sme26'));assert(!checkMaster(''));
const salt=crypto.randomUUID(),record={passwordSalt:salt,passwordHash:await passwordHash('escola123',salt)};
assert(await checkPassword('escola123',record));assert(!await checkPassword('errada',record));assert(!await checkPassword('escola123',{}));assert.notEqual(await passwordHash('escola123',crypto.randomUUID()),record.passwordHash);
console.log('PASS: master password, school password derivation, wrong password and absent hash.');
