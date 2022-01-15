import * as jwt from 'jsonwebtoken';
import {promisify} from "util";
import redisClient from "../redis";
import {ITopManager} from "../interfaces";

const secret = 'test';

const signIn =  (user: ITopManager): string => {
    const payload = { // access token에 들어갈 payload
        user_id: user.user_id,
        name: user.name,
        seq: user.seq,
        role: user.role,
    };
    const token = jwt.sign(payload, secret, {
        algorithm: 'HS256',
        expiresIn: '1d'
    });
    return token;
}

const verify = (token: string):ITopManager|null => {
    try {
        const decoded = <ITopManager>jwt.verify(token, secret);
        return decoded;
    } catch {
        return null;
    }
}

const getRefreshToken = () => {
    return jwt.sign({}, secret, {
        algorithm: 'HS256',
        expiresIn: '30d',
    })
}

const refresh = async (userId: string, token: string) => {
    const getAsync = promisify(redisClient.get).bind(redisClient);
    try {
        const data = await getAsync(userId);
        console.log(data);
        if(data === token) {
            const verify = jwt.verify(token, secret);
            console.log(verify);
        }
    } catch(e) {
        console.log(e)
    }
}

export {verify, signIn, getRefreshToken, refresh}




