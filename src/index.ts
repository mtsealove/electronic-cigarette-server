import express from 'express';
import * as jwt from './jwt/jwt';
import authJWT from "./authJwt";
import * as naver from './naverSms';
import * as sql from './sql';

const app = express();
const cors = require('cors');

// const corsDomain = process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : 'http://52.79.100.182';
// const corsDomain = 'http://localhost:3000';
const corsDomain = 'http://52.79.100.182';

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: corsDomain,
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

app.post('/update/manager/password',authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    const {managerId, pw} = req.body;
    sql.updateManagerPw( pw, managerId)
        .then(()=> {
            res.status(200).json(true);
        })
        .catch(()=>{
            res.status(500).json(false);
        })
})

app.post('/update/manager/phone',authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    const {managerId, phone} = req.body;
    sql.updatePhone( managerId, phone)
        .then(()=> {
            res.status(200).json(true);
        })
        .catch(()=>{
            res.status(500).json(false);
        })
})

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

//  2차 비밀번호
app.post('/verify', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {pin} = req.body;
    const {user_id} = req.params;
    if (user_id) {
        sql.verifyPin(user_id, pin)
            .then(() => {
                res.status(200).json(true);
            }).catch(() => {
            res.status(401).json(false);
        })
    } else {
        res.status(401).json(false);
    }
})

// 2차 비밀번호 변경
app.post('/update/pin', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    const {pin} = req.body;
    if (user_id) {
        sql.updatePin(user_id, pin).then(() => {
            res.status(200).json(true);
        }).catch(() => {
            res.status(500).json(false);
        })
    } else {
        res.status(401).json(false);
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

// 매출 조회
//@ts-ignore
app.get('/earning',authJWT, (req: express.Request<IRequest, {}, {}, ReqEarning>, res: express.Response)=>{
    const {user_id} = req.params;
    const {type, row, page} = req.query;
    sql.getEarning(user_id!, type, page, row)
        .then((result)=>{
            res.status(200).json(result);
        }).catch(()=>{
            res.status(500).json(false);
    })
})

app.get('/warehouse/price', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    if (user_id) {
        sql.getWarehousePrice(user_id)
            .then((result) => {
                res.status(200).json(result);
            }).catch(() => {
            res.status(500).json(false);
        });
    } else {
        res.status(401).json(false);
    }
})

// 회원 등록
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


// 회원 탈퇴
app.post('/members/delete', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {memberId} = req.body;
    const {user_id} = req.params;
    if (user_id) {
        sql.deleteMember(memberId, user_id)
            .then(() => {
                res.status(200).json(true);
            }).catch(() => {
            res.status(500).json(false);
        });
    } else {
        res.status(400).json(false);
    }
});

// 회원 수정
app.post('/members/update', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    const {memberId, name, phone, date} = req.body;
    sql.updateMember(memberId, user_id!, name,phone, date)
        .then(() => {
            res.status(200).json(true);
        }).catch(() => {
        res.status(500).json(false);
    })
})


// @ts-ignore
app.get('/members', authJWT, async (req: express.Request<IRequest, {}, {}, ReqMembers>, res: express.Response) => {
    const {page, rows, query, isPresent} = req.query;
    if (req.params.user_id) {
        if (isPresent) {
            sql.getPresentAbleMembers(req.params.user_id, query || '')
                .then((result) => {
                    res.status(200).json(result);
                }).catch(() => {
                res.status(400).json([]);
            })
        } else {
            sql.getMembers(req.params.user_id, page, rows, query).then((result) => {
                res.status(200).json(result);
            }).catch(() => {
                res.status(400).json([]);
            });
        }
    } else {
        res.status(400).json([]);
    }
});

// 특정 회원 조회
app.get('/members/:memberId', authJWT, async (req: express.Request<IMemberRequest>, res: express.Response) => {
    const {user_id, memberId} = req.params;
    if (user_id) {
        sql.getMember(memberId)
            .then((result) => {
                res.status(200).json(result);
            }).catch(() => {
            res.status(500).json(false);
        })
    } else {
        res.status(400).json(false);
    }
});

// 회원 메모
app.get('/members/:memberId/memo', authJWT, async (req: express.Request<IMemberRequest>, res: express.Response)=>{
    const {user_id, memberId} = req.params;
    if(user_id) {
        sql.getMemberMemo(memberId)
            .then((memo)=>{
                res.status(200).json(memo);
            }).catch(()=>{
                res.status(500).json(null);
        })
    } else {
        res.status(401).json(false);
    }
})

// 사용자별 총액
//@ts-ignore
app.get('/total/members', authJWT, (req: express.Request<IRequest, {}, {}, ReqTotalMember>, res: express.Response)=>{
    const {memberId, date} = req.query;
    sql.getUserTotal(memberId, date)
        .then((result)=>{
            console.log(result);
            res.status(200).json(result);
        }).catch(()=>{
        res.status(400);
    })
});

// 상품별
//@ts-ignore
app.get('/total/items', authJWT, (req: express.Request<IRequest, {}, {}, ReqTotalItem>, res: express.Response)=>{
    const {itemId, date} = req.query;
    sql.getItemTotal(itemId, date)
        .then((result)=>{
            res.status(200).json(result);
        }).catch(()=>{
        res.status(400);
    })
});

app.post('/members/memo', authJWT, async (req: express.Request<IRequest>, res: express.Response)=>{
    const {user_id} = req.params;
    const {memberId, memo} = req.body;
    if(user_id) {
        sql.updateMemberMemo(memberId, memo)
            .then(()=>{
                res.status(200).json(true);
            })
            .catch(()=>{
                res.status(500).json(false);
            })
    } else {
        res.status(401).json(null);
    }
})

// 상품 등록
app.post('/items', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    const {name, price, type, original_price, cash_price} = req.body;
    if (user_id) {
        sql.postItem(user_id, name, price, type, original_price, cash_price)
            .then(() => {
                res.status(200).json(true);
            }).catch(() => {
            res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
});

app.post('/item/update', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {itemId, price, originalPrice, name, stock, itemType, cashPrice} = req.body;
    const {user_id} = req.params;
    if (user_id) {
        sql.updateItem(user_id, itemId, price, originalPrice, name, stock, itemType, cashPrice)
            .then(() => {
                res.status(200).json(true);
            })
            .catch(() => {
                res.status(500).json(false);
            })
    } else {
        res.status(401).json(false);
    }
})

app.post('/item/delete', authJWT, (req: express.Request<IRequest>, res: express.Response)=>{
    const {itemId} = req.body;
    const {user_id} = req.params;
    console.log('delete: ',itemId);
    if(user_id) {
        sql.deleteItem(Number(itemId))
            .then(()=>{
                res.status(200).json(true);
            }).catch(()=>{
                res.status(500).json(false);
        })
    } else {
        res.status(401).json(false);
    }
})

// 특정 상품 조회
app.get('/items/:itemId', authJWT, (req: express.Request<IItemRequest>, res: express.Response) => {
    const {user_id, itemId} = req.params;
    if (user_id) {
        sql.getItem(itemId)
            .then((result) => {
                res.status(200).json(result);
            }).catch(() => {
            res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
});

// 일|월별 판매 순위
//@ts-ignore
app.get('/rank/items', authJWT, async (req: express.Request<IRequest, {}, {}, ReqItemRank>, res: express.Response) => {
    const {user_id} = req.params;
    if (user_id) {
        const {isMonth} = req.query;
        sql.getItemRank(user_id, isMonth === 'true')
            .then((result) => {
                res.status(200).json(result);
            })
            .catch(() => {
                res.json(405).json(false);
            });
    } else {
        res.status(401).json(false);
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
app.post('/items/warehouse', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    if (req.params.user_id) {
        const {id, cnt, date} = req.body;
        sql.warehouseItem(req.params.user_id, id, cnt, date)
            .then(() => {
                res.status(200).json(true);
            }).catch(() => {
            res.status(400).json(false);
        });
    } else {
        res.status(400).json(false);
    }
});

// 상품 판매
app.post('/items/sale', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    if (user_id) {
        const {memberId, itemId, cnt, isPresent, paymentMethod, price, time} = req.body;
        sql.saleItem(user_id, memberId, itemId, cnt, paymentMethod, price, time.replace(/T/gi, ' ') ,isPresent)
            .then(() => res.status(200).json(true))
            .catch(() => res.status(400).json(false));
    }
});

// 판매 내역
//@ts-ignore
app.get('/transactions', authJWT, (req: express.Request<IRequest, {}, {}, ReqTransaction>, res: express.Response) => {
    const {user_id} = req.params;
    const {page, rows, query, date, itemId, memberId} = req.query;

    if (user_id) {
        sql.getTransactions(user_id, query, page, rows, date, itemId, memberId).then((data) => {
            res.status(200).json(data);
        }).catch(() => {
            res.status(400).json(false);
        })
    } else {
        res.status(400).json(false);
    }
})

// 거래 취소
app.post('/transactions/refund', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    if (req.params.user_id) {
        const {transactionId} = req.body;
        sql.cancelTransaction(transactionId)
            .then(() => {
                res.status(200).json(true);
            }).catch(() => {
            res.status(400).json(false);
        })
    }
});

// 메세지 발송
app.post('/send/message', authJWT, async (req: express.Request<IRequest>, res: express.Response) => {
    const {members, message} = req.body;
    if (req.params.user_id) {
        const phone = await sql.getMyPhone(req.params.user_id);
        if(phone) {
            // 회원 ID 목록의 데이터가 존재하지 않으면 전체 발송
            if (members.length === 0) {
                const fetch = await sql.getAllPhoneNumbers(req.params.user_id);
                naver.sendMessage(message, fetch, phone);
                res.status(200).json(true);
            } else {  //  특정 회원 ID 선택 발송
                const fetch = await sql.getPhoneNumbers(members);
                naver.sendMessage(message, fetch, phone);
                res.status(200).json(true);
            }
        } else {
            res.status(502).json(false);
        }
    } else {
        res.status(400).json(false);
    }
});

// 최근 거래
app.get('/recent', authJWT, (req: express.Request<IRequest>, res: express.Response) => {
    const {user_id} = req.params;
    if (user_id) {
        sql.getRecentTransaction(user_id)
            .then((result) => {
                res.status(200).json(result);
            }).catch(() => {
            res.status(400).json(false);
        })
    } else {
        res.status(401).json(false);
    }
});



app.listen(4000, () => {
    console.log('server running');
})
