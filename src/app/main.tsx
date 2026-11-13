import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LibraryScreen } from '../features/library/LibraryScreen.tsx';
import { SyntheticLibrary } from '../features/library/SyntheticLibrary.tsx';
import './styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('The application is missing its root element.');

const mode = document.querySelector('meta[name="organiser-mode"]')?.getAttribute('content');
const synthetic = mode === 'synthetic' || mode === 'harness';
createRoot(root).render(<StrictMode>{synthetic ? <SyntheticLibrary harness={mode === 'harness'} /> : <LibraryScreen />}</StrictMode>);
