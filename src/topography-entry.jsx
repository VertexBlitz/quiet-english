import { createRoot } from 'react-dom/client';
import Topography from './components/Topography.jsx';

const mount = document.getElementById('topography-root');

if (mount) {
  createRoot(mount).render(
    <div
      className="topography-stage"
      style={{ width: '100%', height: '600px', position: 'relative' }}
    >
      <Topography
        color="#4f7cff"
        lineCount={22}
        lineWidth={1.2}
        elevation={1}
        foreground={0.2}
        tilt={32}
        speed={0.25}
        direction="forward"
        glow={0.6}
        depthOfField={0.4}
        fog={0.35}
        hoverEffect="lift"
        clickEffect="pulse"
      />
    </div>
  );
}
