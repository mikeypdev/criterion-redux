import React, { useState } from 'react';
import type { SupplementalContent, Film } from '../types';
import styles from '../styles/supplementalCard.module.css';

interface SupplementalCardProps {
  supplement: SupplementalContent;
  parentFilm: Film;
}

const SupplementalCard: React.FC<SupplementalCardProps> = ({ supplement, parentFilm }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    window.open(supplement.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={styles.root}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className={styles.thumbnailWrapper}>
        <img src={supplement.thumbnailUrl} alt={supplement.title} className={styles.thumbnail} />
        <div className={styles.badge}>Special Feature</div>
        
        <div className={`${styles.overlay} ${isHovered ? styles.overlayVisible : ''}`}>
          <div className={styles.content}>
            <h3 className={styles.title}>{supplement.title}</h3>
            <p className={styles.meta}>
              From: {parentFilm.title} ({parentFilm.year})
              {supplement.runtime ? ` • ${supplement.runtime} min` : ''}
            </p>
            
            <div className={styles.playIcon}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <div className={styles.actionText}>
              Watch on Criterion Channel ↗
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplementalCard;
