import jwt, {Jwt, JwtPayload} from 'jsonwebtoken';
import {promisify} from 'util';
import {ITopManager} from './interfaces';

const redisClient = require('./redis');
const secret = 'test';


const sign = (user: ITopManager): string => { // access token 발급
    const payload = { // access token에 들어갈 payload
        id: user.user_id,
        name: user.name
    };
    return jwt.sign(payload, secret, { // secret으로 sign하여 발급하고 return
        algorithm: 'HS256', // 암호화 알고리즘
        expiresIn: '1h', 	  // 유효기간
    });
};
const verify = (token: string) => { // access token 검증
    let decoded: JwtPayload | string = '';
    try {
        decoded = jwt.verify(token, secret);
        return {
            ok: true,
        };
    } catch (err: any) {
        return {
            ok: false,
            message: err.message,
        };
    }
};
const refresh = () => { // refresh token 발급
    return jwt.sign({}, secret, { // refresh token은 payload 없이 발급
        algorithm: 'HS256',
        expiresIn: '14d',
    });
};

const refreshVerify = async (token: string, userId: string): Promise<boolean> => { // refresh token 검증
    /* redis 모듈은 기본적으로 promise를 반환하지 않으므로,
       promisify를 이용하여 promise를 반환하게 해줍니다.*/
    const getAsync = promisify(redisClient.get).bind(redisClient);

    try {
        const data = await getAsync(userId); // refresh token 가져오기
        if (token === data) {
            try {
                jwt.verify(token, secret);
                return true;
            } catch (err) {
                return false;
            }
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
};

export {sign, verify, refreshVerify, refresh}