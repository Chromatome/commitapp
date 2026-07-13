import React from 'react';
import '../styles/styles.css';

interface ButtonProps {
    label: string;
    onClick: () => void;
    color: string;
    style?: React.CSSProperties;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, color, style, type = 'button', disabled }) => {
    return (
        <div className="btn-wrapper">
            <button
                className="btn"
                type={type}
                disabled={disabled}
                onClick={onClick}
                style={{ "--btn-color": color, ...style } as React.CSSProperties}
            >
                {label}
            </button>
        </div>
    );
};

export default Button;
