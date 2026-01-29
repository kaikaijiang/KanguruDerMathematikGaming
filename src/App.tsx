import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GameBoard from './pages/GameBoard';
import Gallery from './pages/Gallery';
import Results from './pages/Results';
import StorePage from './pages/StorePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/game" element={<GameBoard />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/results" element={<Results />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
