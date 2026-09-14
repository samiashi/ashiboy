import React from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import App from '@/App';
import '@/fonts.css';
import '@/styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <App />
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>,
);
