import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SeoWrapperProps {
    title: string;
    description: string;
    keywords?: string;
}

const SeoWrapper: React.FC<SeoWrapperProps> = ({ title, description, keywords }) => {
    return (
        <Helmet>
            <title>{title} | Mathe Känguru</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta property="og:title" content={`${title} | Mathe Känguru`} />
            <meta property="og:description" content={description} />
            <meta name="twitter:title" content={`${title} | Mathe Känguru`} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    );
};

export default SeoWrapper;
