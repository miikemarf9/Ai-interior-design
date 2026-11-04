import { Header } from '@/components/Header';
import styles from './page.module.css';

export default function LoadingFurniture() {
  return <main><Header /><section className={styles.hero} aria-busy="true"><p className={styles.eyebrow}>Explore furniture</p><h1>Finding your next piece…</h1><p role="status">Loading our curated collection.</p></section></main>;
}
