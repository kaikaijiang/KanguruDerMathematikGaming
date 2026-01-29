import { useNavigate } from 'react-router-dom';
import StickerStore from '../components/Store/StickerStore';

const StorePage = () => {
    const navigate = useNavigate();
    return <StickerStore onClose={() => navigate(-1)} />;
};

export default StorePage;
