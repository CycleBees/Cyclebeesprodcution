
const twilio = require("twilio");

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

const twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);


// send SMS 
const sendSMS = async (number, message) => {
    try {
        await twilioClient.messages.create({
            body: message,
            from: TWILIO_NUMBER,
            to: `+91${number}`,
        })

        return true
    }catch (e) {
        console.log("Error sending SMS: ", e)
        return false;
    }
}

module.exports = {
    sendSMS
}