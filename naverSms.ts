import CryptoJS from 'crypto-js';
import {SmsMessage} from "./interfaces";
const request = require('request');

const sendMessage = (message: string, phones: string[]) => {
    let resultCode = 404;
    const date = Date.now().toString();
    const uri = 'ncp:sms:kr:255267670713:sms_test'; //서비스 ID
    const secretKey = '1IpAXPx20chQNjadtXlIOY5D9cSq7xRjIsev8wua';// Secret Key
    const accessKey = 'rpZb3tyXr6TVxsO2vHkJ';//Access Key
    const method = "POST";
    const space = " ";
    const newLine = "\n";
    const url = `https://sens.apigw.ntruss.com/sms/v2/services/${uri}/messages`;
    const url2 = `/sms/v2/services/${uri}/messages`;
    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
    hmac.update(method);
    hmac.update(space);
    hmac.update(url2);
    hmac.update(newLine);
    hmac.update(date);
    hmac.update(newLine);
    hmac.update(accessKey);
    const hash = hmac.finalize();
    const signature = hash.toString(CryptoJS.enc.Base64);
    const messages: SmsMessage[] = [];
    phones.forEach((phone)=>{
        messages.push({
            to: phone
        });
    })
    request({
            method: method,
            json: true,
            uri: url,
            headers: {
                "Content-type": "application/json; charset=utf-8",
                "x-ncp-iam-access-key": accessKey,
                "x-ncp-apigw-timestamp": date,
                "x-ncp-apigw-signature-v2": signature,
            },
            body: {
                type: "SMS",
                countryCode: "82",
                from: '01063461686',
                content: message,
                messages
            },
        },

        (err: any, res: Response, html: any) => {
            if (err) console.log(err);
            else {
                resultCode = 200;
                console.log(html);
            }
        }
    )
    ;
    return resultCode;
}

export {sendMessage}