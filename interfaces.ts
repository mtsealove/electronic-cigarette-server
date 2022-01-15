interface ITopManager {
    name: string;
    user_id: string;
    seq: number;
    role?: 'manager' | 'topManager';
}

interface ReqAuth {
    token: string;
}

interface ReqDuplicate {
    id: string;
}

interface ReqMembers {
    page: number;
    rows: number;
    query?: string;
}

type ItemType = 'liquid' | 'device' | 'coil' | 'pod' | 'etc';

type SortType = 'asc' | 'desc';

type SortBy = 'name' | 'price' | 'stock' | 'type';

interface ReqItems {
    page: number;
    rows: number;
    query?: string;
    itemType?: ItemType;
    sort: SortBy;
    sortType: SortType;
}

interface ResultTopManager extends ITopManager {
    token: string;
}

interface IRequest {
    user_id?: string;
    user_type?: string;
    seq: number;
}

interface IMemberRequest extends IRequest {
    memberId: number;
}

interface IStore {
    user_id: string;
    name: string;
    addr: string;
    registerDate: string;
}

interface ResMembers {
    cnt: number;
    members: IMember[];
}

interface ResItems {
    cnt: number;
    items: IItem[];
}

interface IMember {
    member_id: string;
    name: string;
    phone: string;
    registerDate: string;
    recent: string;
    cnt: number;
    present: number;
}

interface IItem {
    id: number;
    name: string;
    price: number;
    type: ItemType;
    stock: number;
}

interface ITransaction {
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
}

interface ResTransactions {
    cnt: number;
    transactions: ITransaction[];
    price: number;
}

type TransactionDate = 'today' | 'month' |'all';
interface ReqTransaction {
    page: number;
    rows: number;
    query: string;
    date: TransactionDate;
    itemId?: number;
    memberId?: number;
}

interface ISingleMember {
    manager_id: string;
    name: string;
    phone: string;
    register_date: string;
    present: number;
    member_id: number;
}

interface SmsMessage {
    to: string;
}

export {
    ITopManager,
    IRequest,
    ResultTopManager,
    ReqAuth,
    ReqDuplicate,
    IStore,
    IMember,
    ReqMembers,
    ResMembers,
    ReqItems,
    ItemType,
    SortType,
    IItem,
    ResItems,
    SortBy,
    ITransaction,
    ReqTransaction,
    ResTransactions,
    TransactionDate,
    IMemberRequest,
    ISingleMember,
    SmsMessage,
}