export const serverAPIPort = process.env.PORT || 3232;
export const host = 'http://localhost'
export const APIDomain = 'tickets';
export const APIPath = `/api/${APIDomain}`;
export const APIRootPath = `${host}:${serverAPIPort}${APIPath}`
export const staticsPort = 3000;
export const staticsUrl = `${host}:${staticsPort}/`;
