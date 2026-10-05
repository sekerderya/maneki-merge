import './ui/styles.css';
import { renderBootScreen } from './ui/bootScreen';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

renderBootScreen(root);
