import { paginationSchema } from "@/shared/schemas";
import * as yup from "yup";
import { HISTORY_ACTION_TYPE, HISTORY_ENTITY_TYPE } from "./constants";
import { UserSchema } from "../users/schemas/user.schema";

export const FilterHistorySchema = paginationSchema.shape({
    noPaging: yup.boolean().default(false),
    entityType: yup.string().oneOf(Object.values(HISTORY_ENTITY_TYPE)).required("Loại thực thể là bắt buộc"),
    entityId: yup.string().required("ID thực thể là bắt buộc"),
    action: yup.string().oneOf(Object.values(HISTORY_ACTION_TYPE)).optional(),
    userId: yup.string().optional(),
    startDate: yup.date().transform((value) => value ? new Date(value) : undefined).optional(),
    endDate: yup.date().transform((value) => value ? new Date(value) : undefined).optional(),
    sortBy: yup.string().oneOf(["createdAt", "entityType", "action"]).optional(),
    sortOrder: yup.string().oneOf(["ASC", "DESC"]).optional(),
});

export type FilterHistorySchemaType = yup.InferType<typeof FilterHistorySchema>;


export const HistorySchemaType = yup.object({
    id: yup.string().uuid().required(),
    entityType: yup.string().oneOf(Object.values(HISTORY_ENTITY_TYPE)).required(),
    entityId: yup.string().required(),
    action: yup.string().oneOf(Object.values(HISTORY_ACTION_TYPE)).required(),
    title: yup.string().required(),
    message: yup.string().required(),
    oldValue: yup.object().required(),
    newValue: yup.object().required(),
    metadata: yup.object().required(),
    userId: yup.string().uuid().required(),
    createdAt: yup.date().required(),
    user: UserSchema.optional(),
});

export type HistorySchemaType = yup.InferType<typeof HistorySchemaType>;