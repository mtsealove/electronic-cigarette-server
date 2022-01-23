import express from "express";
import {verify} from './jwt/jwt';

const authJWT = (req:express.Request<IRequest>, res:express.Response, next:express.NextFunction) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ') [1]; // header에서 access token을 가져옵니다.
        const result = verify(token);
        // console.log(result);
        if(result) {
            req.params.user_id = result.user_id;
            req.params.seq = result.seq;
            next();
        } else {
            res.status(401).json({
                result: false,
                message: 'no auth'
            });
        }

        /*
        const result = verify(token); // token을 검증합니다.
        if (result.ok) { // token이 검증되었으면 req에 값을 세팅하고, 다음 콜백함수로 갑니다.
            req.params.user_id = result.id;
            next();
        } else { // 검증에 실패하거나 토큰이 만료되었다면 클라이언트에게 메세지를 담아서 응답합니다.
            res.status(401).send({
                ok: false,
                message: result.message, // jwt가 만료되었다면 메세지는 'jwt expired'입니다.
            });
        }

         */
    }
};
export default authJWT;
