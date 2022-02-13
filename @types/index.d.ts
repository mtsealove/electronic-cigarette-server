declare namespace NodeJS {
    interface Process {
        env: ProcessEnv
    }
    interface ProcessEnv {
        NAVER_URL: string;
        NAVER_SECRET_KEY: string;
        NAVER_ACCESS_KEY: string;
        DB_HOST: string;
        DB_USER: string;
        DB_PW: string;
        DB: string;
        DB_SECRET: string;
        NODE_ENV: string;
    }
}

declare interface ITopManager {
    name: string;
    user_id: string;
    seq: number;
    role?: 'manager' | 'topManager';
}

declare interface ReqAuth {
    token: string;
}

declare interface ReqDuplicate {
    id: string;
}

declare interface ReqMembers {
    page: number;
    rows: number;
    query?: string;
    isPresent?: boolean;
}

declare interface ReqEarning {
    type: string;
    page: number;
    row: number;
}

declare type ItemType = 'liquid' | 'device' | 'coil' | 'pod' | 'etc';

declare type SortType = 'asc' | 'desc';

declare type SortBy = 'name' | 'price' | 'stock' | 'type';

declare interface ReqItems {
    page: number;
    rows: number;
    query?: string;
    itemType?: ItemType;
    sort: SortBy;
    sortType: SortType;
}

declare interface ResultTopManager extends ITopManager {
    token: string;
}

declare interface IRequest {
    user_id?: string;
    user_type?: string;
    seq: number;
}

declare interface IMemberRequest extends IRequest {
    memberId: number;
}

declare interface IItemRequest extends IRequest {
    itemId: number;
}

declare interface IStore {
    user_id: string;
    name: string;
    addr: string;
    registerDate: string;
}

declare interface ResMembers {
    cnt: number;
    members: IMember[];
}

declare interface ResItems {
    cnt: number;
    items: IItem[];
}

declare interface IMember {
    member_id: string;
    name: string;
    phone: string;
    registerDate: string;
    recent: string;
    cnt: number;
    present: number;
}

declare interface IItem {
    id: number;
    name: string;
    price: number;
    type: ItemType;
    stock: number;
    original_price: number;
}

declare interface IItemCnt extends IItem{
    cnt: number;
}

declare interface ITransaction {
    id: number;
    member_id?: number;
    item_id: number;
    transactionType: string;
    cnt: number;
    transactionDate: string;
    memberName: string;
    itemName: string;
    phone: string;
    price: number;
    original_price: number;
    payment_method: string;
}

declare interface ResTransactions {
    cnt: number;
    transactions: ITransaction[];
    price: number;
}

declare type TransactionDate = 'today' | 'month' | 'all';

declare interface ReqTransaction {
    page: number;
    rows: number;
    query: string;
    date: TransactionDate;
    itemId?: number;
    memberId?: number;
}

declare interface ISingleMember {
    manager_id: string;
    name: string;
    phone: string;
    register_date: string;
    present: number;
    member_id: number;
}

declare interface SmsMessage {
    to: string;
}

declare interface ISingleItem {
    id: number;
    owner_id: string;
    name: string;
    price: number;
    type: string;
    stock: number;
}

declare interface ReqItemRank {
    isMonth: string;
}

declare interface IRecent {
    memberName: string;
    member_id: number;
    item_id: number;
    transactionType: string;
    cnt: number;
    transactionDate: string;
    itemName: string;
    price: string;
}

declare interface IWarehousePrice {
    daily: number;
    monthly: number;
}

declare interface IEarning {
    transactionDate: string;
    price: number;
    ogPrice: number;
}

declare interface IEarningCalc extends IEarning{
    warehouse: number;
}

declare interface ResEarning {
    items: IEarningCalc[];
    cnt: number;
}
