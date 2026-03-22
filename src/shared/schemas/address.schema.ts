import * as yup from 'yup';

// --- Shared/Location Schemas ---

export const LocationSchema = yup.object({
    code: yup.string().nullable().optional(),
    name: yup.string().nullable().optional(),
    level: yup.string().nullable().optional(),
    parentCode: yup.string().nullable().optional(),
    divisionType: yup.string().nullable().optional(),
    type: yup.string().nullable().optional(),
    codename: yup.string().nullable().optional(),
    isDeleted: yup.boolean().optional(),
    createdAt: yup.string().nullable().optional(),
    updatedAt: yup.string().nullable().optional(),
    deletedAt: yup.string().nullable().optional(),
});

export const AddressInfoSchema = yup.object({
    id: yup.string().optional(),
    entityType: yup.string().optional(),
    entityId: yup.string().optional(),
    provinceCode: yup.number().nullable().optional(),
    districtCode: yup.number().nullable().optional(),
    wardCode: yup.number().nullable().optional(),
    postalCode: yup.string().nullable().optional(),
    latitude: yup.number().nullable().optional(),
    longitude: yup.number().nullable().optional(),
    isDeleted: yup.boolean().optional(),
    createdAt: yup.string().nullable().optional(),
    updatedAt: yup.string().nullable().optional(),
    deletedAt: yup.string().nullable().optional(),
    province: LocationSchema.nullable().optional(),
    district: LocationSchema.nullable().optional(),
    ward: LocationSchema.nullable().optional(),
});

export type AddressInfoSchemaType = yup.InferType<typeof AddressInfoSchema>;
export type LocationSchemaType = yup.InferType<typeof LocationSchema>;
