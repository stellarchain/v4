
const { xdr } = require('@stellar/stellar-sdk');

const value = "AAAADwAAAAR3b3Jr"; // "work"
try {
    const scVal = xdr.ScVal.fromXDR(value, 'base64');
    console.log("Type:", scVal.switch().name);
    console.log("Value:", scVal.sym().toString());
} catch (e) {
    console.error(e);
}
