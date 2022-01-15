import express from 'express';
import * as jwt from './jwt/jwt';
import redisClient from './redis';
import authJWT from "./authJwt";
import * as sql from './sql';
import * as naver from './naverSms';
import {
    IMemberRequest,
    IRequest,
    ItemType,
    ITopManager,
    ReqAuth,
    ReqDuplicate,
    ReqItems,
    ReqMembers, ReqTransaction,
    ResultTopManager, SortType
} from "./interfaces";
import {login} from "./sql";

const app = express();
const cors = require('cors');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

// 전체 관리자 로그인
app.post('/top/login', async (req: express.Request, res: express.Response) => {
    const {id, pw} = req.body;
    try {
        const result: ITopManager = await sql.topLogin(id, pw);
        // 로그인 성공
        if (result) {
            result.role = 'topManager';
            const token = jwt.signIn(result);
            const finalResult: ResultTopManager = {
                user_id: result.user_id,
                name: result.name,
                seq: result.seq,
                token
            }
            res.status(200).json(finalResult);
        }
    } catch (e) {
        console.log(e);
        res.status(401).json()
    }
})

// 전체 관리자 정보 변경
app.post('/top/update', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {seq} = req.params;
    const {id, pw} = req.body;
    sql.updateLoginInfo(seq, id, pw)
        .then(() => {
            res.status(200).json(true);
        }).catch(() => {
        res.status(400).json(false);
    });
});

// ID 중복 확인
app.get('/top/duplicate', async (req: express.Request<{}, {}, {}, ReqDuplicate>, res: express.Response) => {
    const {id} = req.query;
    try {
        const usable = await sql.checkIdDuplicate(id);
        res.json({usable})
    } catch {
        res.json({usable: false});
    }
})

// 전체 관리자 매장 추가
app.post('/top/add', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {seq} = req.params;
    const {id, pw, name, addr} = req.body;
    sql.addStore(id, pw, seq, name, addr)
        .then((result) => {
            if (result) {
                res.status(200).json({status: true});
            } else {
                res.status(400).json({status: false});
            }
        })
        .catch(() => {
            res.status(400).json({status: false});
        });
});

// 매장 확인
app.get('/top/stores', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {seq} = req.params;
    sql.getStores(seq).then((results) => {
        res.status(200).json(results);
    }).catch(() => {
        res.status(400).json({});
    })
});

// 관리자 로그인
app.post('/login', async (req: express.Request, res: express.Response) => {
    const {id, pw} = req.body;
    try {
        const result: ITopManager = await sql.login(id, pw);
        // 로그인 성공
        if (result) {
            result.role = 'manager';
            const token = jwt.signIn(result);
            const finalResult: ResultTopManager = {
                user_id: result.user_id,
                name: result.name,
                seq: result.seq,
                role: 'manager',
                token
            }
            res.status(200).json(finalResult);
        }
    } catch (e) {
        console.log(e);
        res.status(401).json()
    }
})

app.get('/auth', (req: express.Request<{}, {}, {}, ReqAuth>, res: express.Response) => {
    const token: string = req.query.token;
    const vf = jwt.verify(token);
    if (vf) {
        res.status(200).json(vf);
    } else {
        res.status(400).json({message: 'auth fail'});
    }
});

app.post('/members', authJWT, async (req: express.Request<IRequest>, res: express.Response) => {
    const {name, phone, registerDate} = req.body;
    if (req.params.user_id) {
        try {
            await sql.postMember(req.params.user_id, name, phone, registerDate)
            res.status(200).json(true);
        } catch {
            res.status(400).json(false);
        }
    } else {
        res.status(500).json(false);
    }
});


// @ts-ignore
app.get('/members', authJWT, async (req: express.Request<IRequest, {}, {},ReqMembers>, res: express.Response) => {
    const {page, rows, query} = req.query;
    if (req.params.user_id) {
        sql.getMembers(req.params.user_id, page, rows, query).then((result) => {
            res.status(200).json(result);
        }).catch(() => {
            res.status(400).json([]);
        });
    } else {
        res.status(400).json([]);
    }
});

app.get('/members/:memberId', authJWT ,async (req: express.Request<IMemberRequest>, res: express.Response)=>{
    const {user_id, memberId} = req.params;
    if(user_id) {
        sql.getMember(memberId)
            .then((result)=>{
                res.status(200).json(result);
            }).catch(()=>{
            res.status(500).json(false);
        })
    } else {
        res.status(400).json(false);
    }
})

// 상품 조회
app.post('/items', authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    const {user_id} = req.params;
    const {name, price, type} = req.body;
    if(user_id) {
        sql.postItem(user_id, name, price, type)
            .then(()=>{
                res.status(200).json(true);
            }).catch(()=>{
                res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
});

// @ts-ignore
app.get('/items', authJWT, (req: express.Request<IRequest, {}, {}, ReqItems>, res: express.Response) => {
    const {page, rows, query, itemType, sort, sortType} = req.query;
    if (req.params.user_id) {
        sql.getItems(req.params.user_id, page, rows, sort, sortType, query, itemType).then((result) => {
            res.status(200).json(result);
        }).catch(() => {
            res.status(400).json([]);
        });
    } else {
        res.status(400).json([]);
    }
});

// 상품 입고
app.post('/items/warehouse', authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    if(req.params.user_id) {
        const {id, cnt} = req.body;
        sql.warehouseItem(req.params.user_id,id, cnt)
            .then(()=>{
                res.status(200).json(true);
            }).catch(()=>{
                res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
});

// 상품 판매
app.post('/items/sale', authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    const {user_id} = req.params;
    if(user_id) {
        const {memberId, itemId, cnt} = req.body;
        sql.saleItem(user_id, memberId, itemId, cnt)
            .then(()=>res.status(200).json(true))
            .catch(()=>res.status(400).json(false));
    }
});

// 판매 내역
//@ts-ignore
app.get('/transactions', authJWT, (req: express.Request<IRequest, {}, {}, ReqTransaction>, res: express.Response)=>{
    const {user_id} = req.params;
    const {page, rows, query, date, itemId, memberId} = req.query;

    console.log('item: ', itemId);
    console.log('member:',memberId);
    if(user_id) {
        sql.getTransactions(user_id, query, page, rows, date, itemId, memberId).
            then((data)=>{
                res.status(200).json(data);
        }).catch(()=>{
            res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
})

// 거래 취소
app.post('/transactions/refund', authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    if(req.params.user_id) {
        const {transactionId} = req.body;
        sql.cancelTransaction(transactionId)
            .then(()=>{
                res.status(200).json(true);
            }).catch(()=>{
                res.status(400).json(false);
        })
    }
});

// 메세지 발송
app.post('/send/message', authJWT, async (req: express.Request<IRequest>, res: express.Response)=>{
    const {members, message} = req.body;
    if(req.params.user_id) {
        // 회원 ID 목록의 데이터가 존재하지 않으면 전체 발송
        if(members.length===0) {
            const fetch = await sql.getAllPhoneNumbers();
            res.status(200).json(true);
        } else {  //  특정 회원 ID 선택 발송
            const fetch = await sql.getPhoneNumbers(members);
            naver.sendMessage(message, fetch);
            res.status(200).json(true);
        }
    } else {
        res.status(400).json(false);
    }
})

app.listen(4000, () => {
    console.log('server running');
})