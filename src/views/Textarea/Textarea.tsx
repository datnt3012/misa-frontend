import React from 'react';
import styles from './Textarea.module.scss';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";


interface TextareaProps {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    rows?: number;
    className?: string;
    maxLength?: number;
    showCount?: boolean; // Hiển thị bộ đếm ký tự
}

export const TextareaCustom: React.FC<TextareaProps> = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    error,
    disabled = false,
    rows = 4,
    className = '',
    maxLength,
    showCount = false,
}) => {
    const currentLength = value?.length || 0;

    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && (
                <Label htmlFor={name} className={styles.label}>
                    {label} {required && <span className={styles.required}>*</span>}
                </Label>
            )}

            <Textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
            />

            {showCount && maxLength && (
                <div className={styles.counter}>
                    {currentLength}/{maxLength}
                </div>
            )}

            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
};
