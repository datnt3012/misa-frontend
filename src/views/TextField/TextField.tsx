import React from 'react';
import styles from './TextField.module.scss';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextFieldProps {
    label?: string;
    name?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    className?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    type = 'text',
    required = false,
    error,
    disabled = false,
    className = '',
}) => {
    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && (
                <Label htmlFor={name} className={styles.label}>
                    {label} {required && <span className={styles.required}>*</span>}
                </Label>
            )}

            <Input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`${styles.input} ${error ? styles.inputError : ''}`}
            />

            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
};
