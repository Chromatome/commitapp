import React from 'react';
import '../styles/styles.css';

interface LinkButtonProps {
    label: string;
    href: string;
    color?: string;
    style?: React.CSSProperties;
    isPrimary?: boolean; 
}

const LinkButton: React.FC<LinkButtonProps> = ({ label, href, color = "var(--gray-bg)", style, isPrimary = false }) => {
    return (
        <div className="btn-wrapper">
            <a
                href={href}
                className={`btn ${isPrimary ? 'btn-primary' : ''}`}
                style={{ "--btn-color": color, ...style } as React.CSSProperties}
            >
                {label}
        </a>
        </div>
    );
};

export default LinkButton;
