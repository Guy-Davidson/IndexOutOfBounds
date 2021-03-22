import axios from 'axios';
import {APIRootPath} from '@fed-exam/config';

export const SORT_DATE = 1;
export const SORT_TITLE = 2;
export const SORT_EMAIL = 3;
export const SORT_DESC = 3;
export const SORT_DEFAULT = 0;
export const PAGE_DEFAULT = 1;
export const DATE_VERB_DEFAULT = "";
export const DATE_VERB_BEFORE = 'before';
export const DATE_VERB_AFTER = 'after';
export const EMAIL_VERB = 'from'
export const SEARCH_BY_LABEL_DEFAULT = 'Clear';
export const DID_YOU_MEAN_ID = "99999999-9999-9999-9999-999999999999";
export const PAGE_SIZE = 20;

export type Ticket = {
    id: string,
    title: string;
    content: string;
    creationTime: number;
    userEmail: string;
    labels?: string[];
    answers: Answer[];
    isStared?: boolean;
    isFeatured?: boolean;
}


export type Answer = {
    ticketID: string,
    email: string;
    reply: string;
    creationTime: string;
}

export type SearchResult = {
  search: string,
  result: string[]
}

export type ApiClient = {
    getTickets: (superSearch: boolean, sortBy: number, page: number, date: string, dateVerb: string, from: string, title: string, searchByLabel: string) => Promise<Ticket[]>;
    getLabels: (getLabels: boolean) => Promise<string[]>;
    patchTicketAPI:(ticket: Ticket) => Promise<string>;
}

export const createApiClient = (): ApiClient => {
    return {
        getTickets: (superSearch: boolean = false, sortBy: number = SORT_DEFAULT, page: number = PAGE_DEFAULT, date: string = "",
          dateVerb: string = DATE_VERB_DEFAULT, from: string = "", title: string = "", searchByLabel: string = "") => {
            return axios.get(APIRootPath + `?superSearch=${superSearch}&sortBy=${sortBy}
              &page=${page}&date=${date}&dateVerb=${dateVerb}&from=${from}&title=${title}&searchByLabel=${searchByLabel}`).then((res) => res.data);
        },
        getLabels: (getLabels: boolean) => {
          return axios.get(APIRootPath + `?getLabels=${getLabels}`).then((res) => res.data);
        },
        patchTicketAPI:(ticket: Ticket) => {
          return axios.patch(APIRootPath + `/${ticket.id}/`, { ticket }).then((res) => res.data);
        }
    }
}
