import * as jwt from 'jsonwebtoken';

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


export {verify, signIn }




