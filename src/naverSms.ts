import CryptoJS from 'crypto-js';
const request = require('request');

// 네이버 sms 발송 api
const sendMessage = (message: string, phones: string[]) => {


    let resultCode = 404;
    const date = Date.now().toString();
    const uri: string = process.env.NAVER_URL; //서비스 ID
    const secretKey = process.env.NAVER_SECRET_KEY;// Secret Key
    const accessKey = process.env.NAVER_ACCESS_KEY;//Access Key
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

console.log(CryptoJS.SHA256('test').toString());