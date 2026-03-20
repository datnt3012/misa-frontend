import axiosClient from "./axiosClient";

export const request = async <T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    options?: {
        data?: any;
        params?: any;
        signal?: AbortSignal;
        responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    }
) => {
    return await axiosClient.request<T>({
        method,
        url,
        data: options?.data,
        params: options?.params,
        signal: options?.signal,
        responseType: options?.responseType,
    });
};