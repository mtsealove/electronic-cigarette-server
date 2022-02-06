import {MysqlError,} from "mysql";
import * as crypto from 'crypto';

const cryptoSecret = process.env.DB_SECRET;

const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,    // 호스트 주소
    user: process.env.DB_USER,           // mysql user
    password: process.env.DB_PW,       // mysql password
    database: process.env.DB         // mysql 데이터베이스
});

const topLogin = (id: string, pw: string): Promise<ITopManager> => {
    return new Promise<ITopManager>(((resolve, reject) => {
        const hashed = crypto.createHmac('sha256', cryptoSecret).update(pw).digest('hex');
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
        console.log('update:', hashed);
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
                   order by registerDate desc limit ?, ?`;
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

const postItem = (managerId: string, name: string, price: string, type: string, original_price: number) => (
    new Promise<boolean>(((resolve, reject) => {
        connection.query('insert into items(owner_id, name, price, type, original_price) values(?, ?, ?, ?, ?)'
            , [managerId, name, price, type, original_price],
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

const getItems = (managerId: string, page: number, rows: number, sort: SortBy, sortType: SortType, query?: string, itemType?: ItemType) => (
    new Promise<ResItems>(((resolve, reject) => {
        const startIdx = page * rows
        let sql = `select id, name, price, type, stock, original_price
                   from items
                   where owner_id = '${managerId}' and !deprecated `;
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

const updateItem = (managerId: string, itemId: number, price: number, ogPrice: number) => {
    return new Promise<boolean>((resolve, reject) => {
        const query = 'update items set price = ?, original_price = ? where id = ? and owner_id =?';
        connection.query(query, [price, ogPrice, itemId, managerId], (err: MysqlError|null)=>{
            if(err) {
                console.error(err);
                reject();
            } else {
                resolve(true);
            }
        })
    });
}


const warehouseItem = (managerId: string, id: number, cnt: number) => {
    return new Promise(((resolve, reject) => {
        connection.query('update items set stock = stock + ? where id = ?', [cnt, id],
            (err: MysqlError | null) => {
                if (err) {
                    console.error(err);
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

const saleItem = (managerId: string, memberId: number, itemId: number, cnt: number, paymentMethod: string, price: number,isPresent?: boolean) => {
    return new Promise<boolean>(((resolve, reject) => {
        const query = 'insert into transactions(owner_id, member_id, item_id, transactionType, cnt, payment_method, price) values(?, ?, ?, ?, ?, ?, ?)';
        const method = isPresent ? 'none' : paymentMethod;
        const cntPrice = cnt* price;
        connection.query(query, [managerId, memberId, itemId, isPresent ? 'present' : 'sale', cnt, method,cntPrice],
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
                                // 증정이면 회원 업데이트
                                if (isPresent) {
                                    const sql3 = 'update members set present = present +1 where member_id = ?';
                                    connection.query(sql3, [memberId], (e3: MysqlError | null) => {
                                        if (e3) {
                                            console.error(e3);
                                            reject()
                                        } else {
                                            resolve(true);
                                        }
                                    })
                                } else {
                                    resolve(true);
                                }
                            }
                        });
                }
            });
    }));
}

const getTransactions = (ownerId: string, keyword: string, page: number, rows: number, date: TransactionDate, itemId?: number, memberId?: number) => {
    return new Promise<ResTransactions>(((resolve, reject) => {
        const startIdx = page * rows
        let query = `select tt.*, ii.name as itemName, ii.original_price
                     from (select t.id,
                                  t.member_id,
                                  t.item_id,
                                  t.transactionType,
                                  t.cnt,
                                  t.payment_method,
                                  t.price, 
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


        connection.query(query, [ownerId], (e0: MysqlError|null, r0: ITransaction[])=>{
            if(e0){
                console.error(e0);
                reject();
            } else {
                query += ` order by id desc limit ?, ?`;
                connection.query(query, [ownerId, startIdx, Number(rows)], (err: MysqlError | null, result: ITransaction[]) => {
                    if (err) {
                        console.error(err);
                        reject();
                    } else {
                        let price = 0;
                        result.forEach((rs) => {
                            if (rs.transactionType === 'sale') {
                                price += rs.price;
                            } else if (rs.transactionType === 'refund') {
                                price -= rs.price;
                            }
                        })
                        resolve({
                            cnt: r0.length,
                            transactions: result,
                            price,
                        });
                    }
                })
            }
        })
    }));
}


const cancelTransaction = (transactionId: number) => {
    return new Promise<boolean>(((resolve, reject) => {
        const query0 = `select *
                        from transactions
                        where id = ?`
        const query1 = 'insert into transactions(owner_id,  member_id, item_id, transactionType, cnt) values(?, ?, ?, ?, ?)';
        const query2 = 'select cnt, item_id from transactions where id = ?';
        const query3 = 'update items set stock = stock + ? where id = ?';
        connection.query(query0, [transactionId], (e0: MysqlError | null, result1: any[]) => {
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

const getItem = (itemId: number) => {
    return new Promise<ISingleItem>((resolve, reject) => {
        const query = 'select * from items where id = ?';
        connection.query(query, [itemId], (e: MysqlError | null, result: ISingleItem[]) => {
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
        });
    });
}

const getPhoneNumbers = (members: number[]) => {
    return new Promise<string[]>((resolve, reject) => {
        const query = `select phone
                       from members
                       where member_id in (${members.toString()})`;
        connection.query(query, (e: MysqlError | null, result: { phone: string }[]) => {
            if (e) {
                reject();
            } else {
                const finalResult: string[] = [];
                result.forEach((re) => {
                    finalResult.push(re.phone.replace(/-/gi, ''));
                })
                resolve(finalResult);
            }
        })
    })
}
const getAllPhoneNumbers = (memberId: string) => {
    return new Promise<string[]>((resolve, reject) => {
        const query = `select phone
                       from members
                       where manager_id = ?`;
        connection.query(query, [memberId], (e: MysqlError | null, result: { phone: string }[]) => {
            if (e) {
                reject();
            } else {
                const finalResult: string[] = [];
                result.forEach((re) => {
                    finalResult.push(re.phone.replace(/-/gi, ''));
                })
                resolve(finalResult);
            }
        })
    });
}

// 회원 탈퇴
const deleteMember = (memberId: number, managerId: string) => {
    return new Promise((resolve, reject) => {
        const query = 'delete from members where member_id =? and manager_id = ?';
        connection.query(query, [memberId, managerId], (e: MysqlError | null) => {
            if (e) {
                console.error(e);
                reject();
            } else {
                resolve(true);
            }
        });
    });
}

const getPresentAbleMembers = (memberId: string, query: string) => {
    return new Promise<ResMembers>((resolve, reject) => {
        const sql = `select result.*
                     from (select mmmmm.*, ttttt.cnt
                           from (select mmmm.*, tttt.recent
                                 from (select member_id,
                                              name,
                                              phone,
                                              date_format(register_date, '%Y-%m-%d') as registerDate,
                                              present
                                       from members
                                       where manager_id = 'mtsealove') mmmm
                                          left outer join (
                                     select group_concat(recent order by transactionDate desc) recent, member_id
                                     from (select concat(name, '(', cnt, ')') as recent, member_id, transactionDate
                                           from (select i.name, t.cnt, t.member_id, t.transactionDate
                                                 from transactions t
                                                          join items i on t.item_id = i.id) tt) ttt
                                     group by member_id
                                 ) tttt
                                                          on mmmm.member_id = tttt.member_id) mmmmm
                                    left outer join (select sum(cnt * (if(transactionType = 'sale', 1, -1))) cnt,
                                                            member_id
                                                     from (
                                                              select t.*
                                                              from (select sum(cnt) cnt, member_id, item_id, transactionType
                                                                    from transactions
                                                                    group by member_id, item_id, transactionType) t
                                                                       join items i on i.id = t.item_id
                                                              where i.type = 'liquid'
                                                          ) tt
                                                     group by member_id) ttttt
                                                    on mmmmm.member_id = ttttt.member_id) result
                              join (
                         select tt.*
                         from (select tt.*
                               from (select m.*, t.cnt
                                     from members m
                                              join
                                          (select sum(cnt) cnt, member_id
                                           from (
                                                    select t.*
                                                    from transactions t
                                                             join items i
                                                                  on t.item_id = i.id
                                                    where i.type = 'liquid'
                                                ) t
                                           where member_id is not null
                                           group by member_id) t on m.member_id = t.member_id
                                     where m.manager_id = '${memberId}') tt
                               where cnt - present * 10 >= 10) tt
                         where cnt - present * 10 >= 10) filtered
                                   on result.member_id = filtered.member_id
                     where result.name like '%${query}%'
                        or result.phone like '%${query}%'`;
        console.log(sql);
        connection.query(sql, (err: MysqlError | null, results: IMember[]) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                console.log('request');
                resolve({
                    members: results,
                    cnt: results.length
                });
            }
        })
    });
}

// 상품별 순위
const getItemRank = (managerId: string, isMonth: boolean) => {
    return new Promise<IItemCnt[]>((resolve, reject) => {
        let format = '%Y-%m-%d';
        if (isMonth) {
            format = '%Y-%m';
        }
        const query = `select i.*, t.cnt
                       from (select item_id, sum(cnt) cnt
                             from transactions
                             where date_format(transactionDate, ?) = date_format(now(), ?)
                               and transactionType = 'sale'
                             group by item_id) t
                                join
                            items i on t.item_id = i.id
                       where owner_id = ?
                       order by cnt desc limit 10`;
        // console.log(query);
        connection.query(query, [format, format, managerId],
            (err: MysqlError | null, result: IItemCnt[]) => {
                // console.log(result);
                if (err) {
                    console.error(err);
                    reject();
                } else {
                    resolve(result);
                }
            });
    })
};

const getRecentTransaction = (managerId: string) => {
    return new Promise<IRecent[]>((resolve, reject) => {
        const query = `select mm.name as memberName, tt.*
                       from (select t.*, i.name as itemName, i.price
                             from (select member_id,
                                          item_id,
                                          transactionType,
                                          cnt,
                                          date_format(transactionDate, '%Y-%m-%d %H:%i') transactionDate
                                   from transactions
                                   where owner_id = ?
                                  ) t
                                      join
                                  items i on t.item_id = i.id) tt
                                left outer join members mm
                                                on tt.member_id = mm.member_id
                       order by transactionDate desc limit 10`;
        connection.query(query, [managerId], (err: MysqlError | null, results: IRecent[]) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                resolve(results);
            }
        });
    })
}

const verifyPin = (managerId: string, pin: string) => {
    return new Promise<boolean>((resolve, reject) => {
        const query = 'select count(*) cnt from managers where user_id = ? and pin = ?';
        connection.query(query, [managerId, pin], (err: MysqlError, result: any[]) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                const {cnt} = result[0];
                if (cnt === 1) {
                    resolve(true);
                } else {
                    reject();
                }
            }
        })
    })
}

const updatePin = (managerId: string, pin: string) => {
    return new Promise<boolean>((resolve, reject) => {
        const query = 'update managers set pin = ? where user_id = ?';
        connection.query(query, [pin, managerId], (err: MysqlError | null) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                resolve(true);
            }
        })
    })
}

const getWarehousePrice = (managerId: string) => {
    return new Promise<IWarehousePrice>((resolve, reject) => {
        const query = `select sum(price) price
                       from (
                                select t.cnt * i.original_price as price
                                from (
                                         select *
                                         from transactions
                                         where owner_id = ?
                                           and transactionType = 'warehouse'
                                           and date_format(transactionDate, ?) = date_format(now(), ?)
                                     ) t
                                         join items i on t.item_id = i.id) tt`;
        connection.query(query, [managerId, '%Y-%m-%d', '%Y-%m-%d'], (err: MysqlError | null, r0: any[]) => {
            if (err) {
                console.error(err);
                reject();
            } else {
                connection.query(query, [managerId, '%Y-%m', '%Y-%m'], (e1: MysqlError | null, r1: any[]) => {
                    if (e1) {
                        console.error(e1);
                        reject();
                    } else {
                        resolve({
                            daily: r0[0].price,
                            monthly: r1[0].price,
                        });
                    }
                })
            }
        })
    })
};


export {
    addStore,
    updateItem,
    postItem,
    getItems,
    warehouseItem,
    getWarehousePrice,
    updatePin,
    getItemRank,
    getTransactions,
    getRecentTransaction,
    getPresentAbleMembers,
    getMembers,
    getItem,
    getAllPhoneNumbers,
    getPhoneNumbers,
    getMember,
    getStores,
    postMember,
    updateLoginInfo,
    checkIdDuplicate,
    cancelTransaction, verifyPin,
    deleteMember, login, topLogin, saleItem,
}

