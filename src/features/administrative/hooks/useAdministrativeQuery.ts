import { API } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { ADMINISTRATIVE_API } from "../administrative.api";

export const useProvincesQuery = () => {
    return useQuery({
        queryKey: ["provinces"],
        queryFn: () => ADMINISTRATIVE_API.GET_PROVINCES({ noPagination: true, level: 1, version: 2, }),
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};

export const useDistrictsQuery = () => {
    const payload = {
        noPagination: true,
        level: 2,
        version: 2,
        limit: 1000
    }
    return useQuery({
        queryKey: ["districts"],
        queryFn: () => ADMINISTRATIVE_API.GET_PROVINCES(payload),
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};

export const useWardsQuery = (provinceCode?: string) => {
    const payload = {
        noPagination: true,
        level: 3,
        version: 2,
        limit: 1000,
        parentCode: provinceCode
    }
    return useQuery({
        queryKey: ["wards", provinceCode],
        queryFn: () => ADMINISTRATIVE_API.GET_WARDS(payload),
        enabled: !!provinceCode,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};