import * as yup from 'yup';

export const UserRoleSchema = yup.object({
    id: yup.string().required('ID không được để trống'),
    name: yup.string().required('Tên vai trò không được để trống'),
    description: yup.string().optional(),
    nameTranslated: yup.string().optional(),
    descriptionTranslated: yup.string().optional(),
    permissions: yup.array().of(yup.string().required()).optional(),
});

export const UserSchema = yup.object({
    id: yup.string().required('ID không được để trống'),
    email: yup.string().email('Email không hợp lệ').optional(),
    username: yup.string().required('Tên đăng nhập không được để trống'),
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    phoneNumber: yup.string().optional(),
    address: yup.string().optional(),
    avatarUrl: yup.string().optional(),
    isActive: yup.boolean().required('Trạng thái không được để trống'),
    isDeleted: yup.boolean().required(),
    roleId: yup.string().required('Vai trò không được để trống'),
    role: UserRoleSchema.optional(),
    createdAt: yup.string().required(),
    updatedAt: yup.string().required(),
    deletedAt: yup.string().optional(),
});

export const CreateUserSchema = yup.object({
    email: yup.string().email('Email không hợp lệ').optional(),
    username: yup.string().required('Tên đăng nhập không được để trống'),
    password: yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Mật khẩu không được để trống'),
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    phoneNumber: yup.string().optional(),
    address: yup.string().optional(),
    roleId: yup.string().required('Vai trò không được để trống'),
});

export const UpdateUserSchema = yup.object({
    email: yup.string().email('Email không hợp lệ').optional(),
    username: yup.string().optional(),
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    phoneNumber: yup.string().optional(),
    address: yup.string().optional(),
    roleId: yup.string().optional(),
    isActive: yup.boolean().optional(),
    password: yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
});

export const EmailPreferencesSchema = yup.object({
    receive_order_notifications: yup.boolean().required(),
    receive_status_updates: yup.boolean().required(),
    receive_payment_updates: yup.boolean().required(),
});

export type UserRoleSchemaType = yup.InferType<typeof UserRoleSchema>;
export type UserSchemaType = yup.InferType<typeof UserSchema>;
export type CreateUserRequest = yup.InferType<typeof CreateUserSchema>;
export type UpdateUserRequest = yup.InferType<typeof UpdateUserSchema>;
export type EmailPreferences = yup.InferType<typeof EmailPreferencesSchema>;

export interface UserPreferencesResponse {
    email: EmailPreferences;
}
