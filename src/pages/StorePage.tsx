import { useNavigate } from 'react-router-dom';
import StickerStore from '../components/Store/StickerStore';

import SeoWrapper from '../components/SeoWrapper';



const StorePage = () => {
    const navigate = useNavigate();
    return (
        <>
            <SeoWrapper title="Store" description="Spend your points and unlock new avatars in the store!" />
            <StickerStore onClose={() => navigate(-1)} />
        </>
    );
};

export default StorePage;
