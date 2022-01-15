import {MysqlError,} from "mysql";
import {
    IItem,
    IMember, ISingleMember,
    IStore,
    ItemType,
    ITopManager,
    ITransaction, ReqTransaction,
    ResItems,
    ResMembers, ResTransactions,
    SortBy,
    SortType, TransactionDate
} from "./interfaces";
import * as crypto from 'crypto';

const cryptoSecret = 'MySecretKey1$1$234';

const mysql = require('mysql');
const connection = mysql.createConnection({
    host: '13.124.40.113',    // 호스트 주소
    user: 'vape_manager',           // mysql user
    password: 'Locker0916*',       // mysql password
    database: 'kvape'         // mysql 데이터베이스
});

const topLogin = (id: string, pw: string): Promise<ITopManager> => {
    return new Promise<ITopManager>(((resolve, reject) => {
        const hashed = crypto.createHmac('sha256', cryptoSecret).update(pw).digest('hex');
        console.log(hashed);
        connection.query('select seq, name, user_id from top_managers where user_id = ? and password = ?', [id, hashed], (err: MysqlError | null, result: any) => {
            if (err) {
                reject();
            } else {
                if (result.length !== 0) {
                    resolve(result[0]);
                } else {
                    reject();
                }
            }
        })
    }))
}

const login = (id: string, pw: string) => {
    return new Promise<ITopManager>(((resolve, reject) => {
        const hashed = crypto.createHmac('sha256', cryptoSecret).update(pw).digest('hex');
        connection.query('select user_id, name, seq from managers where user_id = ? and password = ?',
            [id, hashed], (err: MysqlError | null, results: ITopManager[]) => {
                if (err) {
                    reject();
                } else {
                    if (results.length !== 0) {
                        resolve(results[0]);
                    } else {
                        reject();
                    }
                }
            });
    }));
}

// 관리자 정보 변경
const updateLoginInfo = (seq: number, id: string, pw: string) => {
    return new Promise<boolean>(((resolve, reject) => {
        const hashed = crypto.createHmac('sha256', cryptoSecret).update(pw).digest('hex');
        connection.query('update top_managers set user_id = ?, password = ? where seq=?', [id, hashed, seq], (err: MysqlError | null) => {
            if (err) {
                reject();
            } else {
                resolve(true);
            }
        });
    }));
}

// ID 중복 체크
const checkIdDuplicate = (id: string): Promise<boolean> => {
    return new Promise<boolean>(((resolve, reject) => {
        connection.query('select count(*) as cnt from managers where user_id = ?', [id], (err: MysqlError | null, results: any) => {
            if (err) {
                reject();
            } else {
                resolve(results[0].cnt === 0);
            }
        });
    }));
}

// 매장 추가
const addStore = (id: string, pw: string, seq: number, name: string, addr: string) => {
    return new Promise<boolean>(((resolve, reject) => {
        const hashed = crypto.createHmac('sha256', cryptoSecret).update(pw).digest('hex');
        connection.query('insert into managers(user_id, top_seq, password, name, addr) values(?, ?, ?, ?, ?)',
            [id, seq, hashed, name, addr], (err: MysqlError | null) => {
                if (err) {
                    console.log(err);
                    reject();
                } else {
                    resolve(true);
                }
            });
    }));
}

// 매장 목록
const getStores = (seq: number) => {
    return new Promise<IStore[]>(((resolve, reject) => {
        connection.query('select user_id, name, addr, date_format(registerDate, \'%Y-%m-%d\') as registerDate from managers where top_seq=?',
            [seq], (err: MysqlError | null, results: IStore[]) => {
                if (err) {
                    reject();
                } else {
                    resolve(results);
                }
            })
    }));
}

// 회원 등록
//# member_id, manager_id, name, phone, register_date
const postMember = (managerId: string, name: string, phone: string, registerDate: string) => {
    return new Promise(((resolve, reject) => {
        connection.query('insert into members(manager_id, name, phone, register_date) values(?, ?, ?, ?)',
            [managerId, name, phone, registerDate], (err: MysqlError | null) => {
                if (err) {
                    reject();
                } else {
                    resolve(true);
                }
            });
    }));
};

const getMembers = (managerId: string, page: number, rows: number, query?: string) => (
    new Promise<ResMembers>(((resolve, reject) => {
        const startIdx = page * rows
        let sql = `select mmmmm.*, ttttt.cnt
                   from (select mmmm.*, tttt.recent
                         from (select member_id,
                                      name,
                                      phone,
                                      date_format(register_date, \'%Y-%m-%d\') as registerDate,
                                      present
                               from members
                               where manager_id = ?) mmmm
                                  left outer join (
                             select group_concat(recent order by transactionDate desc) recent, member_id
                             from (select concat(name, '(', cnt, ')') as recent, member_id, transactionDate
                                   from (select i.name, t.cnt, t.member_id, t.transactionDate
                                         from transactions t
                                                  join items i on t.item_id = i.id) tt) ttt
                             group by member_id
                         ) tttt
                                                  on mmmm.member_id = tttt.member_id) mmmmm
                            left outer join (select sum(cnt * (if(transactionType = 'sale', 1, -1))) cnt, member_id
                                             from (
                                                      select t.*
                                                      from (select sum(cnt) cnt, member_id, item_id, transactionType
                                                            from transactions
                                                            group by member_id, item_id, transactionType) t
                                                               join items i on i.id = t.item_id
                                                      where i.type = 'liquid'
                                                  ) tt
                                             group by member_id) ttttt
                                            on mmmmm.member_id = ttttt.member_id
                   order by member_id desc limit ?, ?`;
        const values = [managerId, startIdx, Number(rows)];
        if (query) {
            sql = `select mmmmm.*, ttttt.cnt
                   from (select mmmm.*
                         from (select member_id,
                                      name,
                                      phone,
                                      date_format(register_date, \'%Y-%m-%d\') as registerDate,
                                      present
                               from members
                               where manager_id = ?
                                 and (name like '%${query}%' or phone like '%${query}%')) mmmm
                                  left outer join (
                             select group_concat(recent order by transactionDate desc) recent, member_id
                             from (select concat(name, '(', cnt, ')') as recent, member_id, transactionDate
                                   from (select i.name, t.cnt, t.member_id, t.transactionDate
                                         from transactions t
                                                  join items i on t.item_id = i.id) tt) ttt
                             group by member_id
                         ) tttt
                                                  on mmmm.member_id = tttt.member_id) mmmmm
                            left outer join (
                       select sum(cnt * (if(transactionType = 'sale', 1, -1))) cnt, member_id
                       from (
                                select t.*
                                from (select sum(cnt) cnt, member_id, item_id, transactionType
                                      from transactions
                                      group by member_id, item_id, transactionType) t
                                         join items i on i.id = t.item_id
                                where i.type = 'liquid'
                            ) tt
                       group by member_id
                   ) ttttt
                                            on mmmmm.member_id = ttttt.member_id
                   order by member_id desc limit ?, ?`;
        }
        connection.query(sql, values,
            (err: MysqlError | null, results: IMember[]) => {
                if (err) {
                    reject();
                } else {
                    let sql2 = 'select count(member_id) as cnt from members';
                    if (query?.length !== 0) {
                        sql2 = `select count(member_id) as cnt
                                from members
                                where name like '%${query}%'
                                   or phone like '%${query}%'`;
                    }
                    connection.query(sql2, (e2: MysqlError | null, cntResult: any) => {
                        if (e2) {
                            console.log(e2);
                            reject();
                        } else {
                            const cnt = cntResult[0].cnt;
                            console.log(cnt);
                            resolve({
                                members: results,
                                cnt,
                            });
                        }
                    })
                }
            })
    }))
);


const getItems = (managerId: string, page: number, rows: number, sort: SortBy, sortType: SortType, query?: string, itemType?: ItemType) => (
    new Promise<ResItems>(((resolve, reject) => {
        const startIdx = page * rows
        let sql = `select id, name, price, type, stock
                   from items
                   where owner_id = '${managerId}'`;
        if (query) {
            sql += ` and name like '%${query}%'`;
        }
        if (itemType) {
            sql += ` and type = '${itemType}'`;
        }
        sql += ` order by ${sort} ${sortType} limit ${startIdx}, ${Number(rows)}`;
        connection.query(sql,
            (err: MysqlError | null, results: IItem[]) => {
                if (err) {
                    console.error(err);
                    reject();
                } else {
                    let sql2 = `select count(id) as cnt
                                from items
                                where name like '%%'`;
                    if (query) {
                        sql2 += ` and name like '%${query}%'`;
                    }
                    if (itemType) {
                        sql2 += ` and type = '${itemType}'`
                    }
                    connection.query(sql2, (e2: MysqlError | null, cntResult: any) => {
                        if (e2) {
                            console.log(e2);
                            reject();
                        } else {
                            const cnt = cntResult[0].cnt;
                            console.log(cnt);
                            resolve({
                                items: results,
                                cnt,
                            });
                        }
                    })
                }
            })
    }))
);

const postItem = (managerId: string, name: string, price: string, type: string) => (
    new Promise<boolean>(((resolve, reject) => {
        connection.query('insert into items(owner_id, name, price, type) values(?, ?, ?, ?)', [managerId, name, price, type],
            (err: MysqlError | null) => {
                if (err) {
                    console.log(err);
                    reject();
                } else {
                    resolve(true);
                }
            });
    }))
);

const warehouseItem = (managerId: string, id: number, cnt: number) => {
    return new Promise(((resolve, reject) => {
        connection.query('update items set stock = stock + ? where id = ?', [cnt, id],
            (err: MysqlError | null) => {
                if (err) {
                    reject();
                } else {
                    connection.query('insert into transactions(owner_id, item_id, transactionType, cnt) values (?, ?, ?, ?)',
                        [managerId, id, 'warehouse', cnt],
                        (e2: MysqlError | null) => {
                            if (e2) {
                                reject();
                            } else {
                                resolve(true);
                            }
                        });
                }
            });
    }));
}

const saleItem = (managerId: string, memberId: number, itemId: number, cnt: number) => {
    return new Promise<boolean>(((resolve, reject) => {
        const query = 'insert into transactions(owner_id, member_id, item_id, transactionType, cnt) values(?, ?, ?, ?, ?)';
        connection.query(query, [managerId, memberId, itemId, 'sale', cnt],
            (err: MysqlError | null) => {
                if (err) {
                    console.log(err);
                    reject();
                } else {
                    const sql2 = 'update items set stock = stock - ? where id = ?'
                    connection.query(sql2, [cnt, itemId],
                        (e2: MysqlError | null) => {
                            if (e2) {
                                console.error(e2);
                                reject();
                            } else {
                                resolve(true);
                            }
                        });
                }
            });
    }));
}

const getTransactions = (ownerId: string, keyword: string, page: number, rows: number, date: TransactionDate, itemId?: number, memberId?: number) => {
    return new Promise<ResTransactions>(((resolve, reject) => {
        console.log(keyword);
        const startIdx = page * rows
        let query = `select tt.*, ii.name as itemName, ii.price
                     from (select t.id,
                                  t.member_id,
                                  t.item_id,
                                  t.transactionType,
                                  t.cnt,
                                  date_format(t.transactionDate, '%Y-%m-%d %H:%i') as transactionDate,
                                  m.name                                           as memberName,
                                  m.phone
                           from transactions t
                                    left outer join members m
                                                    on t.member_id = m.member_id
                           where owner_id = ? `;
        query += `) tt
                join items ii on tt.item_id = ii.id`;
        if (keyword.length !== 0) {
            query += ` where ii.name like '%${keyword}%' or memberName like '%${keyword}%' or phone like '%${keyword}%' `;
            if (date === 'today') {
                query += ` and date_format(transactionDate, 'Y-%m-%d') = date_format(now(), 'Y-%m-%d') `
            } else if (date === 'month') {
                query += ` and date_format(transactionDate, 'Y-%m') = date_format(now(), 'Y-%m') `
            }
            if (itemId) {
                query += ` and ii.id=${itemId}`;
            }
            if (memberId) {
                query += ` and tt.member_id = '${memberId}'`;
            }
        } else {
            if (date === 'today') {
                query += ` where date_format(transactionDate, 'Y-%m-%d') = date_format(now(), 'Y-%m-%d') `;
                if (itemId) {
                    query += ` and ii.id = ${itemId}`;
                }
                if (memberId) {
                    query += ` and tt.member_id = '${memberId}'`;
                }
            } else if (date === 'month') {
                query += ` where date_format(transactionDate, 'Y-%m') = date_format(now(), 'Y-%m') `;
                if (itemId) {
                    query += ` and ii.id = ${itemId}`;
                }
                if (memberId) {
                    query += ` and tt.member_id='${memberId}'`;
                }
            } else {
                if (itemId) {
                    query += ` where ii.id = ${itemId}`;
                    if (memberId) {
                        query += ` and tt.member_id ='${memberId}'`;
                    }
                } else {
                    if (memberId) {
                        query += ` where tt.member_id='${memberId}'`
                    }
                }
            }
        }

        query += ` order by id desc limit ?, ?`;
        connection.query(query, [ownerId, startIdx, Number(rows)], (err: MysqlError | null, result: ITransaction[]) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                let price = 0;
                result.forEach((rs) => {
                    if (rs.transactionType === 'sale') {
                        price += rs.price * rs.cnt;
                    } else if (rs.transactionType === 'refund') {
                        price -= rs.price * rs.cnt;
                    }
                })
                resolve({
                    cnt: result.length,
                    transactions: result,
                    price,
                });
            }
        })
    }));
}

type transactionValues = {
    owner_id: string;
    member_id: number;
    item_id: number;
    cnt: number;
    transactionType: string;
}

const cancelTransaction = (transactionId: number) => {
    return new Promise<boolean>(((resolve, reject) => {
        const query0 = `select *
                        from transactions
                        where id = ?`
        const query1 = 'insert into transactions(owner_id,  member_id, item_id, transactionType, cnt) values(?, ?, ?, ?, ?)';
        const query2 = 'select cnt, item_id from transactions where id = ?';
        const query3 = 'update items set stock = stock + ? where id = ?';
        connection.query(query0, [transactionId], (e0: MysqlError | null, result1: transactionValues[]) => {
            if (e0) {
                console.error(e0);
                reject();
            } else {
                const {owner_id, member_id, item_id, cnt, transactionType} = result1[0];
                let newTransaction = 'cancel';
                if (transactionType === 'sale') {
                    newTransaction = 'refund';
                }

                connection.query(query1, [owner_id, member_id, item_id, newTransaction, cnt], (e1: MysqlError | null) => {
                    if (e1) {
                        console.error(e1);
                        reject();
                    } else {
                        connection.query(query2, [transactionId], (e2: MysqlError | null, result: { cnt: number, item_id: number }[]) => {
                            if (e2) {
                                console.error(e2);
                                reject();
                            } else {
                                const {cnt, item_id} = result[0];
                                connection.query(query3, [cnt, item_id], (e3: MysqlError | null) => {
                                    if (e3) {
                                        console.error(e3);
                                        reject();
                                    } else {
                                        resolve(true);
                                    }
                                })
                            }
                        });
                    }
                })
            }
        })

    }));
}

const getMember = (memberId: number) => {
    return new Promise<ISingleMember>((resolve, reject) => {
        const query = 'select * from members where member_id = ?';
        connection.query(query, [memberId],
            (e: MysqlError | null, result: ISingleMember[]) => {
                if (e) {
                    console.error(e);
                    reject();
                } else {
                    if (result.length !== 0) {
                        resolve(result[0]);
                    } else {
                        reject();
                    }
                }
            })
    });
}

const getPhoneNumbers = (members: number[]) => {
    return new Promise<string[]>((resolve, reject)=>{
        const query = `select phone from members where member_id in (${members.toString()})`;
        connection.query(query, (e: MysqlError|null, result: {phone: string}[])=>{
            if(e) {
                reject();
            } else {
                const finalResult: string[] = [];
                result.forEach((re)=> {
                    finalResult.push(re.phone.replace(/-/gi, ''));
                })
                resolve(finalResult);
            }
        })
    })
}
const getAllPhoneNumbers = () => {
    return new Promise<string[]>((resolve, reject)=>{
        const query = `select phone from members`;
        connection.query(query, (e: MysqlError|null, result: {phone: string}[])=>{
            if(e) {
                reject();
            } else {
                const finalResult: string[] = [];
                result.forEach((re)=> {
                    finalResult.push(re.phone.replace(/-/gi, ''));
                })
                resolve(finalResult);
            }
        })
    })
}

export {
    topLogin,
    checkIdDuplicate,
    addStore,
    getStores,
    updateLoginInfo,
    login,
    postMember,
    getMembers,
    postItem,
    getItems,
    warehouseItem,
    saleItem,
    getTransactions,
    cancelTransaction,
    getMember,
    getPhoneNumbers,
    getAllPhoneNumbers,
};

