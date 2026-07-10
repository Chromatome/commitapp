import React from 'react';
import '../styles/styles.css';

interface ButtonProps {
    label: string;
    onClick: () => void;
    color: string;
    style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, color, style }) => {
    return (
        <button
            className="btn"
            onClick={onClick}
            style={{ "--btn-color": color, ...style } as React.CSSProperties}
        >
            {label}
        </button>
    );
};

export default Button;
